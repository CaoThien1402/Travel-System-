import os
import re
import ast
import json
import unicodedata
from typing import List, Optional, Dict, Any, Tuple

import pandas as pd

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.docstore.document import Document
from langchain_community.vectorstores import FAISS


# =========================
# CONFIG
# =========================
MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Cho phép override để tránh lệch path khi chạy ở nhiều nơi (CLI / backend / notebook)
CSV_PATH = os.getenv("HOTEL_CSV_PATH") or os.path.join(CURRENT_DIR, "..", "backend", "src", "data", "hotels.csv")
VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH") or os.path.join(CURRENT_DIR, "vectorstores", "db_faiss")


def _detect_device() -> str:
    """Tự chọn device nếu có GPU, không có thì dùng CPU."""
    try:
        import torch  # type: ignore

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def _to_float(value) -> Optional[float]:
    try:
        if pd.isna(value):
            return None
        return float(value)
    except Exception:
        return None


def _to_int(value) -> Optional[int]:
    try:
        if pd.isna(value):
            return None
        return int(value)
    except Exception:
        return None


def _strip_accents(text: str) -> str:
    if text is None:
        return ""
    text = str(text)
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", text)


def _normalize_spaces(text: str) -> str:
    return " ".join(str(text).split())


def _normalize_text(text: str) -> str:
    """Chuẩn hoá để phục vụ matching: lowercase + bỏ dấu + bỏ ký tự lạ."""
    s = _strip_accents(str(text).lower())
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return _normalize_spaces(s)


# =========================
# PRICE PARSING (NEW: support range like "490000 - 1150000")
# =========================

def _parse_price_number(piece: str) -> Optional[int]:
    """Parse 1 phần giá sang VND integer.

    Hỗ trợ:
    - "490000" / "1,150,000" / "1.150.000"
    - "1.2 triệu", "800k" (phòng trường hợp data khác)
    """
    if piece is None:
        return None
    s = str(piece).strip().lower()
    if not s or s in {"nan", "none"}:
        return None

    # normalize decimal separators
    s = s.replace("₫", "").replace("vnd", "").strip()

    # triệu / million
    m = re.search(r"(\d+(?:[\.,]\d+)?)\s*(trieu|triệu|million|m)\b", s)
    if m:
        num = float(m.group(1).replace(",", "."))
        return int(num * 1_000_000)

    # nghìn / k
    m = re.search(r"(\d+(?:[\.,]\d+)?)\s*(k|nghin|nghìn)\b", s)
    if m:
        num = float(m.group(1).replace(",", "."))
        return int(num * 1_000)

    # plain digits (remove separators)
    digits = re.sub(r"[^0-9]", "", s)
    if not digits:
        return None
    try:
        return int(digits)
    except Exception:
        return None


def _parse_price_range(value) -> Tuple[Optional[int], Optional[int], Optional[float]]:
    """Parse cột price mới: "min - max".

    Returns: (min_vnd, max_vnd, mid_vnd)
    """
    if value is None or (isinstance(value, float) and value != value) or pd.isna(value):
        return None, None, None

    # numeric already
    if isinstance(value, (int, float)):
        try:
            v = float(value)
            if v != v:
                return None, None, None
            iv = int(v)
            return iv, iv, float(iv)
        except Exception:
            return None, None, None

    s = str(value).strip()
    if not s:
        return None, None, None

    # unify dash types
    s = s.replace("–", "-").replace("—", "-")

    # split on dash if looks like range
    if "-" in s:
        parts = [p.strip() for p in s.split("-") if p.strip()]
        if len(parts) >= 2:
            a = _parse_price_number(parts[0])
            b = _parse_price_number(parts[1])
            if a is None and b is None:
                return None, None, None
            if a is None:
                return b, b, float(b)
            if b is None:
                return a, a, float(a)
            lo, hi = (a, b) if a <= b else (b, a)
            return lo, hi, (lo + hi) / 2.0

    # fallback: single number
    n = _parse_price_number(s)
    if n is None:
        return None, None, None
    return n, n, float(n)


def _format_price_range(min_vnd: Optional[int], max_vnd: Optional[int]) -> str:
    if min_vnd is None and max_vnd is None:
        return "Giá: chưa cập nhật."
    if min_vnd is None:
        return f"Giá tham khảo: {max_vnd/1_000_000:.2f} triệu VND/đêm."
    if max_vnd is None:
        return f"Giá tham khảo: {min_vnd/1_000_000:.2f} triệu VND/đêm."
    if min_vnd == max_vnd:
        return f"Giá tham khảo: {min_vnd/1_000_000:.2f} triệu VND/đêm."
    return f"Khoảng giá tham khảo: {min_vnd/1_000_000:.2f} – {max_vnd/1_000_000:.2f} triệu VND/đêm."


def _extract_star(star_str) -> Optional[int]:
    """VD: 'Khách sạn 4 sao' -> 4"""
    if pd.isna(star_str):
        return None
    s = str(star_str).lower()
    m = re.search(r"(\d+)\s*(sao|star)", s)
    if m:
        val = int(m.group(1))
        return val if 1 <= val <= 5 else None
    m2 = re.search(r"\b(\d)\b", s)
    if m2:
        val = int(m2.group(1))
        return val if 1 <= val <= 5 else None
    return None


def _extract_district_num(district_raw: str) -> Optional[int]:
    s = _normalize_text(district_raw)
    m = re.search(r"(quan|district)\s*0?(\d+)", s)
    if m:
        return int(m.group(2))
    m2 = re.match(r"^\s*(\d+)\s*(?:,|$)", _strip_accents(str(district_raw).lower()))
    if m2:
        return int(m2.group(1))
    return None


def _clean_list_str(list_str) -> str:
    """Làm sạch chuỗi dạng list ['A', 'B'] thành 'A, B'"""
    if pd.isna(list_str):
        return ""
    try:
        actual_list = ast.literal_eval(list_str)
        if isinstance(actual_list, list):
            return ", ".join([str(x) for x in actual_list if x and str(x).strip()])
    except Exception:
        pass
    return str(list_str).strip()


def _calc_price_thresholds(prices_vnd: pd.Series) -> Dict[str, float]:
    """Tính ngưỡng giá theo phân phối dữ liệu (robust).

    Lưu ý: với cột price dạng range, nên truyền vào series MID (giá giữa).
    """
    p = pd.to_numeric(prices_vnd, errors="coerce").dropna()
    if len(p) < 20:
        # Fallback nếu data quá ít
        return {
            "q10": 300_000.0,
            "q25": 500_000.0,
            "q50": 800_000.0,
            "q75": 1_500_000.0,
            "q90": 3_000_000.0,
        }
    return {
        "q10": float(p.quantile(0.10)),
        "q25": float(p.quantile(0.25)),
        "q50": float(p.quantile(0.50)),
        "q75": float(p.quantile(0.75)),
        "q90": float(p.quantile(0.90)),
    }


def _price_segment(price_mid_vnd: Optional[float], th: Dict[str, float]) -> Tuple[str, str]:
    """Trả (label, text)"""
    if price_mid_vnd is None or pd.isna(price_mid_vnd):
        return "unknown", "Giá: chưa cập nhật."
    m = price_mid_vnd / 1_000_000
    if price_mid_vnd <= th["q25"]:
        label = "cheap"
        seg = "giá rẻ / bình dân"
    elif price_mid_vnd <= th["q75"]:
        label = "mid"
        seg = "tầm trung"
    elif price_mid_vnd <= th["q90"]:
        label = "high"
        seg = "cao cấp"
    else:
        label = "lux"
        seg = "luxe / rất cao"
    return label, f"Giá giữa (ước tính): {m:.2f} triệu VND/đêm ({seg})."


def _build_hotel_document(row: pd.Series, th: Dict[str, float]) -> Document:
    hotel_name = str(row.get("hotelname", "")).strip()
    address = str(row.get("address", "")).strip()
    district_raw = str(row.get("district", "") or "")
    district_short = district_raw.split(",")[0].strip() if district_raw else ""
    district_num = _extract_district_num(district_raw)
    district_norm = _normalize_text(district_short)

    rating = _to_float(row.get("totalScore"))
    reviews_count = _to_int(row.get("reviewsCount"))
    star = _extract_star(row.get("star"))

    price_min, price_max, price_mid = _parse_price_range(row.get("price"))
    price_label, price_mid_text = _price_segment(price_mid, th)
    price_range_text = _format_price_range(price_min, price_max)

    amenities = _clean_list_str(row.get("amenities"))
    reviews_list = _clean_list_str(row.get("reviews"))
    description = str(row.get("description1", "") or "").replace("nan", "").strip()

    lat = _to_float(row.get("lat"))
    lon = _to_float(row.get("lng"))
    url = str(row.get("url_google", "") or "").strip()
    image_url = str(row.get("imageUrl", "") or "").strip()

    # ====== PAGE CONTENT: ưu tiên cấu trúc rõ ràng + có "từ khoá" giúp truy hồi ======
    lines: List[str] = []
    if hotel_name:
        lines.append(f"Tên khách sạn: {hotel_name}.")

    if star is not None:
        lines.append(f"Hạng sao: {star} sao.")
    if rating is not None:
        if reviews_count is not None:
            lines.append(f"Đánh giá: {rating:.1f}/5 (khoảng {reviews_count} lượt).")
        else:
            lines.append(f"Đánh giá: {rating:.1f}/5.")

    if district_num is not None:
        lines.append(f"Khu vực: Quận {district_num} (quan {district_num}, district {district_num}).")
    elif district_short:
        lines.append(f"Khu vực: {district_short}.")
    if address:
        lines.append(f"Địa chỉ: {address}.")

    # NEW: show range + mid-based segment
    lines.append(price_range_text)
    if price_mid is not None:
        lines.append(price_mid_text)

    if amenities:
        lines.append(f"Tiện ích: {amenities}.")
    if description and len(description) > 10:
        lines.append(f"Mô tả: {description}.")

    # Reviews dài quá có thể nhiễu, nhưng vẫn giúp semantic search (cắt ngắn)
    if reviews_list:
        short_reviews = reviews_list
        if len(short_reviews) > 600:
            short_reviews = short_reviews[:600] + "..."
        lines.append(f"Nhận xét khách: {short_reviews}")

    # Token hỗ trợ keyword search (accentless)
    tokens: List[str] = []
    tokens.append(f"hotelname_norm: {_normalize_text(hotel_name)}")
    if district_norm:
        tokens.append(f"district_norm: {district_norm}")
    if district_num is not None:
        tokens.append(f"district_num: {district_num}")
    tokens.append(f"price_label: {price_label}")
    if price_min is not None:
        tokens.append(f"price_min_vnd: {int(price_min)}")
    if price_max is not None:
        tokens.append(f"price_max_vnd: {int(price_max)}")
    if price_mid is not None:
        tokens.append(f"price_mid_vnd: {int(price_mid)}")
    lines.append("\nTừ khoá hỗ trợ tìm kiếm: " + " | ".join(tokens))

    metadata: Dict[str, Any] = {
        "hotelname": hotel_name,
        "hotelname_norm": _normalize_text(hotel_name),
        "address": address,
        "district": district_short,
        "district_norm": district_norm,
        "district_num": district_num,
        "rating": rating,
        "reviews_count": reviews_count,
        "star": star,
        # NEW: keep both range + representative mid
        "price_min_vnd": price_min,
        "price_max_vnd": price_max,
        "price_mid_vnd": float(price_mid) if price_mid is not None else None,
        "price_label": price_label,
        "lat": lat,
        "lon": lon,
        "url": url,
        "image_url": image_url,
    }
    if amenities:
        metadata["amenities"] = amenities
    if description and len(description) > 10:
        metadata["description"] = description

    return Document(page_content="\n".join(lines), metadata=metadata)


def create_db_from_csv(csv_path: str = CSV_PATH, vector_db_path: str = VECTOR_DB_PATH):
    """Build FAISS vector DB + lưu metadata ngưỡng giá để chatbot hiểu "giá rẻ" theo dữ liệu.

    NEW: hỗ trợ cột price dạng range "min - max".
    Ngưỡng giá được tính trên "giá giữa" (mid) để ổn định.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Không tìm thấy file CSV: {csv_path}")

    df = pd.read_csv(csv_path)
    df = df[df["hotelname"].notna()].reset_index(drop=True)

    # Parse range price into dedicated columns
    mins, maxs, mids = [], [], []
    for v in df.get("price", pd.Series([None] * len(df))):
        lo, hi, mid = _parse_price_range(v)
        mins.append(lo)
        maxs.append(hi)
        mids.append(mid)
    df["_price_min_vnd"] = mins
    df["_price_max_vnd"] = maxs
    df["_price_mid_vnd"] = mids

    thresholds = _calc_price_thresholds(df.get("_price_mid_vnd"))

    os.makedirs(os.path.dirname(vector_db_path), exist_ok=True)
    meta_path = os.path.join(vector_db_path, "db_meta.json")
    os.makedirs(vector_db_path, exist_ok=True)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "embedding_model": MODEL_NAME,
                "price_thresholds": thresholds,
                "price_representation": "mid_of_range",
                "rows": int(len(df)),
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    device = _detect_device()
    print(f"Khởi tạo embedding model trên device: {device}")

    embedding_model = HuggingFaceEmbeddings(
        model_name=MODEL_NAME,
        model_kwargs={"device": device},
        encode_kwargs={"normalize_embeddings": True},
    )

    documents: List[Document] = [_build_hotel_document(row, thresholds) for _, row in df.iterrows()]

    # Mỗi khách sạn = 1 document (tránh split để mapping hotelname ổn định)
    db = FAISS.from_documents(documents, embedding_model)
    db.save_local(vector_db_path)
    print(f"Đã build và lưu vector DB tại: {vector_db_path}")
    print(f"Đã lưu metadata tại: {meta_path}")
    return db


if __name__ == "__main__":
    create_db_from_csv()
