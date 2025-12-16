import os
import re
import json
import unicodedata
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import numpy as np
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings


# =========================
# CONFIG
# =========================

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Giữ mặc định giống cấu trúc project hiện tại của bạn, nhưng cho phép override bằng env
CSV_PATH = os.getenv("HOTEL_CSV_PATH") or os.path.join(CURRENT_DIR, "..", "backend", "src", "data", "hotels.csv")
VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH") or os.path.join(CURRENT_DIR, "vectorstores", "db_faiss")

EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash-lite")

# Hybrid weights (có thể tinh chỉnh)
W_VEC = float(os.getenv("W_VEC", "0.50"))
W_LEX = float(os.getenv("W_LEX", "0.35"))
W_QUAL = float(os.getenv("W_QUAL", "0.15"))


# =========================
# TEXT NORMALIZATION
# =========================

def _strip_accents(text: str) -> str:
    if text is None:
        return ""
    text = str(text)
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", text)


def _norm_text(text: str) -> str:
    s = _strip_accents(str(text).lower())
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = " ".join(s.split())
    return s


def _extract_star_from_row(star_val) -> Optional[int]:
    if pd.isna(star_val):
        return None
    s = str(star_val).lower()
    m = re.search(r"(\d+)", s)
    return int(m.group(1)) if m else None


def _extract_district_num(district_str) -> Optional[int]:
    """VD: 'Quận 5, ...' -> 5; 'District 1' -> 1; 'Bình Tân' -> None"""
    if pd.isna(district_str):
        return None
    s = _strip_accents(str(district_str).lower())
    m = re.search(r"(quận|quan|district)\s*0?(\d+)", s)
    if m:
        return int(m.group(2))
    m2 = re.match(r"^\s*(\d+)\s*(?:,|$)", s)
    if m2:
        return int(m2.group(1))
    return None


def _district_norm(district_str) -> str:
    if district_str is None or (isinstance(district_str, float) and district_str != district_str):
        return ""
    s = str(district_str).split(",")[0]
    s = _norm_text(s)
    s = s.replace("district", "quan")
    return s


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

    s = s.replace("₫", "").replace("vnd", "").strip()

    m = re.search(r"(\d+(?:[\.,]\d+)?)\s*(trieu|triệu|million|m)\b", s)
    if m:
        num = float(m.group(1).replace(",", "."))
        return int(num * 1_000_000)

    m = re.search(r"(\d+(?:[\.,]\d+)?)\s*(k|nghin|nghìn)\b", s)
    if m:
        num = float(m.group(1).replace(",", "."))
        return int(num * 1_000)

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

    s = s.replace("–", "-").replace("—", "-")

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

    n = _parse_price_number(s)
    if n is None:
        return None, None, None
    return n, n, float(n)


def _format_vnd_int(v: Optional[int]) -> str:
    if v is None:
        return ""
    try:
        return f"{int(v):,}".replace(",", ".")
    except Exception:
        return ""


def _format_price_range_vnd(min_vnd: Optional[int], max_vnd: Optional[int]) -> str:
    if min_vnd is None and max_vnd is None:
        return "chưa cập nhật giá"
    if min_vnd is None:
        return f"khoảng {_format_vnd_int(max_vnd)} VND/đêm"
    if max_vnd is None:
        return f"khoảng {_format_vnd_int(min_vnd)} VND/đêm"
    if min_vnd == max_vnd:
        return f"khoảng {_format_vnd_int(min_vnd)} VND/đêm"
    return f"{_format_vnd_int(min_vnd)} – {_format_vnd_int(max_vnd)} VND/đêm"


# =========================
# PRICE INTENT / THRESHOLDS
# =========================

@dataclass
class PriceThresholds:
    q10: float
    q25: float
    q50: float
    q75: float
    q90: float


def _calc_price_thresholds(price_series: pd.Series) -> Optional[PriceThresholds]:
    p = pd.to_numeric(price_series, errors="coerce").dropna()
    if len(p) < 50:
        return None
    return PriceThresholds(
        q10=float(p.quantile(0.10)),
        q25=float(p.quantile(0.25)),
        q50=float(p.quantile(0.50)),
        q75=float(p.quantile(0.75)),
        q90=float(p.quantile(0.90)),
    )


def _price_bucket(price_vnd: Optional[float], thr: Optional[PriceThresholds]) -> str:
    if price_vnd is None or (isinstance(price_vnd, float) and price_vnd != price_vnd):
        return "chua_ro_gia"
    if thr is None:
        return "gia_thuong"
    if price_vnd <= thr.q25:
        return "gia_re"
    if price_vnd <= thr.q75:
        return "tam_trung"
    if price_vnd <= thr.q90:
        return "cao_cap"
    return "luxury"


def _has_explicit_price(query: str) -> bool:
    q = query.lower()
    return bool(re.search(r"\d+(?:[.,]\d+)?\s*triệu|\d+\s*(?:k|nghìn|ngan|ngan)", q))


def _parse_constraints(query: str, thr: Optional[PriceThresholds]) -> Dict[str, Any]:
    """Parse điều kiện từ câu hỏi + hiểu intent 'giá rẻ' theo phân phối dữ liệu."""
    q_raw = query or ""
    q = _strip_accents(q_raw.lower())

    cons: Dict[str, Any] = {
        "min_price": None,
        "max_price": None,
        "district_nums": None,          # list[int]
        "district_names": None,         # list[str] (norm)
        "min_rating": None,
        "min_star": None,
        "sort_by": "relevance",
        "price_intent": None,           # gia_re / tam_trung / cao_cap / ...
        "explicit_price": False,
        "require_price": False,
    }

    # District number: quận 5 / quan 5 / district 5
    nums = set(int(m.group(2)) for m in re.finditer(r"(quận|quan|district)\s*(\d+)", q))
    if nums:
        cons["district_nums"] = sorted(nums)

    # Star
    stars = []
    for m in re.finditer(r"(\d+)\s*sao", q):
        val = int(m.group(1))
        if 1 <= val <= 5:
            stars.append(val)
    if stars:
        cons["min_star"] = max(stars)

    # Rating
    rating_nums = []
    for m in re.finditer(r"(\d(?:[.,]\d)?)\s*/\s*5", q):
        rating_nums.append(float(m.group(1).replace(",", ".")))
    if rating_nums:
        cons["min_rating"] = max(rating_nums)
    else:
        for m in re.finditer(r"(trên|tren|>=|lớn hơn|lon hon)\s*(\d(?:[.,]\d)?)", q):
            num = float(m.group(2).replace(",", "."))
            if 0 <= num <= 5:
                cons["min_rating"] = max(cons["min_rating"] or 0, num)

    # Explicit price (triệu)
    def num_to_vnd(num_str: str) -> int:
        return int(float(num_str.replace(",", ".")) * 1_000_000)

    # 1-2 triệu
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*triệu", q)
    if m:
        cons["min_price"] = num_to_vnd(m.group(1))
        cons["max_price"] = num_to_vnd(m.group(2))
        cons["explicit_price"] = True

    # từ 1 triệu đến 2 triệu
    m = re.search(r"từ\s+(\d+(?:[.,]\d+)?)\s*triệu.*?(đến|tới|-|toi)\s*(\d+(?:[.,]\d+)?)\s*triệu", q)
    if m:
        cons["min_price"] = num_to_vnd(m.group(1))
        cons["max_price"] = num_to_vnd(m.group(3))
        cons["explicit_price"] = True

    # dưới 2 triệu
    m = re.search(r"(dưới|duoi|nhỏ hơn|nho hon|<=)\s*(\d+(?:[.,]\d+)?)\s*triệu", q)
    if m:
        cons["max_price"] = num_to_vnd(m.group(2))
        cons["explicit_price"] = True

    # trên 1.5 triệu / từ 1.5 triệu
    m = re.search(r"(trên|tren|từ|tu|>=|lớn hơn|lon hon)\s*(\d+(?:[.,]\d+)?)\s*triệu", q)
    if m:
        cons["min_price"] = num_to_vnd(m.group(2))
        cons["explicit_price"] = True

    # Qualitative price intent
    cheap_terms = ["gia re", "re", "binh dan", "tiet kiem", "economy", "budget", "khong dat"]
    very_cheap_terms = ["rat re", "re nhat", "sieu re"]
    mid_terms = ["tam trung", "hop ly", "vua tui", "vua phai"]
    high_terms = ["cao cap", "sang", "luxury", "5 sao", "sieu sang"]

    if not cons["explicit_price"]:
        if any(t in q for t in very_cheap_terms):
            cons["price_intent"] = "gia_re"
            cons["require_price"] = True
            if thr is not None:
                cons["max_price"] = int(thr.q10)
            cons["sort_by"] = "Giá tăng dần"
        elif any(t in q for t in cheap_terms):
            cons["price_intent"] = "gia_re"
            cons["require_price"] = True
            if thr is not None:
                cons["max_price"] = int(thr.q25)
            cons["sort_by"] = "Giá tăng dần"
        elif any(t in q for t in mid_terms):
            cons["price_intent"] = "tam_trung"
            if thr is not None:
                cons["min_price"] = int(thr.q25)
                cons["max_price"] = int(thr.q75)
        elif any(t in q for t in high_terms):
            cons["price_intent"] = "cao_cap"
            if thr is not None:
                cons["min_price"] = int(thr.q75)

    return cons


def _merge_constraints(base: Dict[str, Any], override: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not override:
        return base
    merged = dict(base)
    for k, v in override.items():
        if v not in (None, [], "", 0):
            merged[k] = v
    return merged


# =========================
# LOADERS
# =========================

def _detect_device() -> str:
    try:
        import torch  # type: ignore

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def load_llm() -> ChatGoogleGenerativeAI:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY chưa được thiết lập. Hãy export GOOGLE_API_KEY='YOUR_KEY'.")
    return ChatGoogleGenerativeAI(model=GEMINI_MODEL_NAME, temperature=0.0)


def load_vector_db() -> FAISS:
    if not os.path.exists(VECTOR_DB_PATH):
        raise FileNotFoundError(
            f"Không tìm thấy vector DB ở: {VECTOR_DB_PATH}. Hãy chạy prepare_vector_db.py trước."
        )
    device = _detect_device()
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={"device": device},
        encode_kwargs={"normalize_embeddings": True},
    )
    return FAISS.load_local(VECTOR_DB_PATH, embeddings, allow_dangerous_deserialization=True)


def load_hotel_dataframe() -> Tuple[pd.DataFrame, Optional[PriceThresholds]]:
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Không tìm thấy CSV: {CSV_PATH}")

    df = pd.read_csv(CSV_PATH)

    df["_star_num"] = df["star"].apply(_extract_star_from_row)
    df["_district_num"] = df["district"].apply(_extract_district_num)
    df["_district_norm"] = df["district"].apply(_district_norm)

    # Name norms (giữ để matching)
    df["hotelname_norm"] = df["hotelname"].astype(str).str.strip().str.lower()
    df["hotelname_norm_simple"] = df["hotelname"].apply(
        lambda x: _norm_text(re.sub(r"\b(khach san|khách sạn|hotel)\b", " ", str(x)))
    )

    # NEW: parse price range
    parsed = df["price"].apply(_parse_price_range)
    df["_price_min_vnd"] = parsed.apply(lambda t: t[0])
    df["_price_max_vnd"] = parsed.apply(lambda t: t[1])
    df["_price_mid_vnd"] = parsed.apply(lambda t: t[2])

    # Backward-compat: keep _price_vnd as representative (mid)
    df["_price_vnd"] = pd.to_numeric(df["_price_mid_vnd"], errors="coerce")

    thr = _calc_price_thresholds(df["_price_vnd"])
    return df, thr


# =========================
# LEXICAL (TF-IDF) RETRIEVER
# =========================

@dataclass
class LexicalIndex:
    vectorizer: TfidfVectorizer
    matrix: Any
    row_ids: np.ndarray


def build_lexical_index(df: pd.DataFrame, thr: Optional[PriceThresholds]) -> LexicalIndex:
    def row_text(row: pd.Series) -> str:
        price_mid = row.get("_price_vnd")
        bucket = _price_bucket(price_mid, thr)
        parts = [
            row.get("hotelname", ""),
            row.get("address", ""),
            row.get("district", ""),
            row.get("amenities", ""),
            row.get("description1", ""),
            row.get("reviews", ""),
            f"star {row.get('_star_num') or ''}",
            f"rating {row.get('totalScore') or ''}",
            f"price_bucket {bucket}",
            # thêm cả range để keyword match tốt hơn
            f"price_min {row.get('_price_min_vnd') or ''}",
            f"price_max {row.get('_price_max_vnd') or ''}",
        ]
        return _norm_text(" ".join(str(p) for p in parts if p))

    corpus = [row_text(r) for _, r in df.iterrows()]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=200_000)
    matrix = vectorizer.fit_transform(corpus)
    row_ids = df.index.to_numpy()
    return LexicalIndex(vectorizer=vectorizer, matrix=matrix, row_ids=row_ids)


def lexical_topk(query: str, lex: LexicalIndex, k: int = 50) -> List[Tuple[int, float]]:
    qv = lex.vectorizer.transform([_norm_text(query)])
    sims = cosine_similarity(qv, lex.matrix).ravel()
    if k >= len(sims):
        top_idx = np.argsort(-sims)
    else:
        top_idx = np.argpartition(-sims, k)[:k]
        top_idx = top_idx[np.argsort(-sims[top_idx])]
    return [(int(lex.row_ids[i]), float(sims[i])) for i in top_idx if sims[i] > 0]


# =========================
# HOTEL FORMAT + FILTER
# =========================

def _row_to_hotel(row: pd.Series, match_reason: str = "") -> Dict[str, Any]:
    # Representative price = mid (backward compat)
    price_mid = row.get("_price_vnd")
    price_min = row.get("_price_min_vnd")
    price_max = row.get("_price_max_vnd")

    rating = row.get("totalScore")
    star = row.get("_star_num")

    try:
        price_mid = float(price_mid) if price_mid == price_mid else None
    except Exception:
        price_mid = None

    try:
        rating = float(rating) if rating == rating else None
    except Exception:
        rating = None

    try:
        star = int(star) if star == star else None
    except Exception:
        star = None

    # Frontend detail page typically uses route like /properties/:id
    # Keep both snake_case + camelCase so FE can consume without extra mapping.
    hotel_id = None
    try:
        raw_id = row.get("id")
        hotel_id = int(raw_id) if raw_id == raw_id and raw_id is not None else None
    except Exception:
        hotel_id = None

    image_url = row.get("imageUrl") or ""
    detail_path = f"/properties/{hotel_id}" if hotel_id is not None else ""

    price_text = _format_price_range_vnd(
        int(price_min) if price_min == price_min else None,
        int(price_max) if price_max == price_max else None,
    )

    return {
        "id": hotel_id,
        "hotelname": row.get("hotelname") or "",
        "name": row.get("hotelname") or "",  # alias
        "address": row.get("address") or "",
        "district": row.get("district"),
        "district_num": row.get("_district_num"),
        "rating": rating,
        "star": star,

        # Backward-compat: old field
        "price_vnd": price_mid,
        "budget_vnd": price_mid,

        # New range fields
        "price_min_vnd": int(price_min) if price_min == price_min else None,
        "price_max_vnd": int(price_max) if price_max == price_max else None,
        "price_text": price_text,

        "url_google": row.get("url_google") or "",
        "url": row.get("url_google") or "",  # alias
        "website": row.get("website") or "",

        "imageUrl": image_url,
        "image_url": image_url,

        "detail_path": detail_path,
        "detail_url": detail_path,

        "amenities": row.get("amenities") or "",
        "description": row.get("description1") or "",
        "reviews": row.get("reviews") or "",
        "match_reason": match_reason,
    }


def _district_name_candidates(df: pd.DataFrame) -> Dict[str, str]:
    """map norm -> pretty string"""
    out: Dict[str, str] = {}
    for raw in df["district"].dropna().astype(str).unique().tolist():
        pretty = raw.split(",")[0].strip()
        out[_district_norm(raw)] = pretty
    return out


def _apply_constraints(df: pd.DataFrame, cons: Dict[str, Any]) -> pd.DataFrame:
    mask = pd.Series(True, index=df.index, dtype=bool)

    # District filter
    if cons.get("district_nums"):
        mask &= df["_district_num"].isin(cons["district_nums"])
    elif cons.get("district_names"):
        mask &= df["_district_norm"].isin(cons["district_names"])

    # Price filter with range overlap
    # - nếu user có min_price: cần price_max >= min_price
    # - nếu user có max_price: cần price_min <= max_price
    # - nếu user có cả 2: cần overlap giữa [hotel_min, hotel_max] và [user_min, user_max]
    hotel_min = pd.to_numeric(df["_price_min_vnd"], errors="coerce")
    hotel_max = pd.to_numeric(df["_price_max_vnd"], errors="coerce")

    if cons.get("min_price") is not None:
        if cons.get("explicit_price") or cons.get("require_price"):
            mask &= hotel_max.notna() & (hotel_max >= cons["min_price"])
        else:
            mask &= hotel_max.isna() | (hotel_max >= cons["min_price"])

    if cons.get("max_price") is not None:
        if cons.get("explicit_price") or cons.get("require_price"):
            mask &= hotel_min.notna() & (hotel_min <= cons["max_price"])
        else:
            mask &= hotel_min.isna() | (hotel_min <= cons["max_price"])

    # Nếu user nói "giá rẻ" nhưng không có ngưỡng (thr None) => vẫn yêu cầu phải có giá
    if cons.get("require_price") and cons.get("min_price") is None and cons.get("max_price") is None:
        mask &= hotel_min.notna() | hotel_max.notna()

    # Rating / star
    if cons.get("min_rating") is not None:
        mask &= pd.to_numeric(df["totalScore"], errors="coerce") >= cons["min_rating"]
    if cons.get("min_star") is not None:
        mask &= pd.to_numeric(df["_star_num"], errors="coerce") >= cons["min_star"]

    return df[mask].copy()


# =========================
# HYBRID RETRIEVAL + RANKING
# =========================

def _vec_topk(db: FAISS, query: str, k: int = 50) -> List[Tuple[str, float]]:
    """Return list of (hotelname, vec_sim) where vec_sim in (0,1]."""
    out: List[Tuple[str, float]] = []
    for doc, dist in db.similarity_search_with_score(query, k=k):
        meta = getattr(doc, "metadata", {}) or {}
        name = meta.get("hotelname") or ""
        if not name:
            continue
        # dist: lower is better. Convert to similarity.
        sim = 1.0 / (1.0 + float(dist))
        out.append((str(name), sim))
    return out


def _find_rows_by_names(df: pd.DataFrame, names: List[str]) -> Dict[str, int]:
    # map lower->index for quick lookup
    name_to_idx = {str(n).strip().lower(): int(i) for i, n in zip(df.index, df["hotelname"].astype(str))}
    out: Dict[str, int] = {}
    for nm in names:
        key = str(nm).strip().lower()
        if key in name_to_idx:
            out[nm] = name_to_idx[key]
    return out


def _quality_score(row: pd.Series) -> float:
    r = row.get("totalScore")
    s = row.get("_star_num")
    try:
        r = float(r) if r == r else 0.0
    except Exception:
        r = 0.0
    try:
        s = float(s) if s == s else 0.0
    except Exception:
        s = 0.0
    # 0..1
    return 0.7 * (r / 5.0) + 0.3 * (s / 5.0)


def _price_score(row: pd.Series, cons: Dict[str, Any], thr: Optional[PriceThresholds]) -> float:
    p = row.get("_price_vnd")
    if p is None or (isinstance(p, float) and p != p):
        # nếu chỉ nói 'giá rẻ' thì vẫn được điểm nhỏ; nếu user nói rõ số tiền thì 0.
        return 0.15 if (cons.get("max_price") is not None and not cons.get("explicit_price")) else 0.0
    p = float(p)

    # Nếu có range cụ thể: ưu tiên gần giữa range
    if cons.get("min_price") is not None or cons.get("max_price") is not None:
        lo = float(cons.get("min_price") or p)
        hi = float(cons.get("max_price") or p)
        mid = (lo + hi) / 2.0
        denom = max(hi - lo, 1.0)
        d = abs(p - mid) / denom
        return float(max(0.0, 1.0 - d))

    # Nếu không có constraint cụ thể, dùng bucket
    b = _price_bucket(p, thr)
    if b == "gia_re":
        return 1.0
    if b == "tam_trung":
        return 0.6
    if b == "cao_cap":
        return 0.4
    if b == "luxury":
        return 0.25
    return 0.0


def _explain(row: pd.Series, cons: Dict[str, Any], thr: Optional[PriceThresholds], vec_sim: float, lex_sim: float) -> List[str]:
    lines: List[str] = []

    # District
    if cons.get("district_nums") and row.get("_district_num") in cons["district_nums"]:
        lines.append(f"Đúng khu vực: Quận {int(row.get('_district_num'))}.")
    elif cons.get("district_names") and row.get("_district_norm") in cons["district_names"]:
        lines.append(f"Đúng khu vực: {str(row.get('district')).split(',')[0].strip()}.")

    # Price (range aware)
    pmin = row.get("_price_min_vnd")
    pmax = row.get("_price_max_vnd")
    try:
        pmin = int(pmin) if pmin == pmin else None
    except Exception:
        pmin = None
    try:
        pmax = int(pmax) if pmax == pmax else None
    except Exception:
        pmax = None

    if pmin is not None or pmax is not None:
        if thr is not None and cons.get("price_intent") == "gia_re" and (row.get("_price_vnd") == row.get("_price_vnd")):
            lines.append(f"Giá {_format_price_range_vnd(pmin, pmax)} — thuộc nhóm giá rẻ trong dữ liệu.")
        else:
            lines.append(f"Giá {_format_price_range_vnd(pmin, pmax)}.")
    else:
        if cons.get("price_intent") == "gia_re":
            lines.append("Chưa có giá, nhưng vẫn gợi ý thêm để bạn tham khảo (có thể hỏi lại giá khi đặt).")

    # Rating / star
    r = row.get("totalScore")
    s = row.get("_star_num")
    try:
        r = float(r) if r == r else None
    except Exception:
        r = None
    try:
        s = int(s) if s == s else None
    except Exception:
        s = None

    if r is not None and s is not None:
        lines.append(f"Chất lượng: {s} sao, rating {r:.1f}/5.")
    elif r is not None:
        lines.append(f"Rating {r:.1f}/5.")
    elif s is not None:
        lines.append(f"Hạng {s} sao.")

    # Retrieval evidence
    if vec_sim > 0.0 and lex_sim > 0.0:
        lines.append("Khớp cả theo ngữ nghĩa (vector) lẫn từ khóa (TF-IDF).")
    elif vec_sim > 0.0:
        lines.append("Khớp mạnh theo ngữ nghĩa (vector).")
    elif lex_sim > 0.0:
        lines.append("Khớp mạnh theo từ khóa (TF-IDF).")

    return lines[:4]


def hybrid_search_hotels(
    user_query: str,
    df: pd.DataFrame,
    thr: Optional[PriceThresholds],
    vector_db: FAISS,
    lex: LexicalIndex,
    top_k: int = 5,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:

    cons = _merge_constraints(_parse_constraints(user_query, thr), filters)

    # map district names from query against dataset if needed
    if not cons.get("district_nums"):
        name_map = _district_name_candidates(df)
        qn = _norm_text(user_query)
        hit_names = [norm for norm, pretty in name_map.items() if norm and norm in qn]
        if hit_names:
            cons["district_names"] = sorted(set(hit_names))

    # Candidate retrieval
    vec = _vec_topk(vector_db, user_query, k=60)
    lex_top = lexical_topk(user_query, lex, k=80)

    vec_names = [n for n, _ in vec]
    vec_name_to_sim: Dict[str, float] = {}
    for n, s in vec:
        vec_name_to_sim[n] = max(vec_name_to_sim.get(n, 0.0), s)

    # Build name->row index mapping for vector names
    name_to_idx = _find_rows_by_names(df, vec_names)

    # Collect candidates by row index
    cand: Dict[int, Dict[str, float]] = {}
    for nm, sim in vec_name_to_sim.items():
        idx = name_to_idx.get(nm)
        if idx is None:
            continue
        rec = cand.setdefault(int(idx), {})
        rec["vec"] = max(rec.get("vec", 0.0), float(sim))

    for idx, sim in lex_top:
        rec = cand.setdefault(int(idx), {})
        rec["lex"] = max(rec.get("lex", 0.0), float(sim))

    # Apply constraints
    df_cons = _apply_constraints(df, cons)
    allowed = set(df_cons.index.tolist())
    cand = {idx: sc for idx, sc in cand.items() if idx in allowed}

    # Fallback: nếu candidate rỗng sau filter, lấy trực tiếp từ df_cons theo rating/price
    if not cand:
        df_fb = df_cons.copy()
        df_fb["__rating"] = pd.to_numeric(df_fb["totalScore"], errors="coerce")
        df_fb["__star"] = pd.to_numeric(df_fb["_star_num"], errors="coerce")
        # sort by starting price (min) if available
        df_fb["__price_min"] = pd.to_numeric(df_fb["_price_min_vnd"], errors="coerce").fillna(10**12)
        df_fb = df_fb.sort_values(by=["__rating", "__star", "__price_min"], ascending=[False, False, True])
        out = []
        for _, row in df_fb.head(top_k).iterrows():
            h = _row_to_hotel(row, match_reason="Phù hợp tiêu chí lọc (fallback)")
            h["explain"] = _explain(row, cons, thr, 0.0, 0.0)
            h["hybrid_score"] = None
            out.append(h)
        return out

    # Score + rank
    scored: List[Tuple[int, float, float, float, float]] = []
    for idx, sc in cand.items():
        row = df.loc[idx]
        vec_sim = float(sc.get("vec", 0.0))
        lex_sim = float(sc.get("lex", 0.0))
        qual = _quality_score(row)
        price_sc = _price_score(row, cons, thr)
        total = (W_VEC * vec_sim) + (W_LEX * lex_sim) + (W_QUAL * (0.7 * qual + 0.3 * price_sc))
        scored.append((idx, total, vec_sim, lex_sim, qual))

    scored.sort(key=lambda x: x[1], reverse=True)

    # Sort override
    sort_by = (filters or {}).get("sort_by") or cons.get("sort_by") or "relevance"

    # Build hotels
    out: List[Dict[str, Any]] = []
    for idx, total, vec_sim, lex_sim, qual in scored[: max(top_k * 3, top_k)]:
        row = df.loc[idx]
        h = _row_to_hotel(row, match_reason="Hybrid retrieval (vector + keyword)")
        h["hybrid_score"] = round(float(total), 6)
        h["vec_score"] = round(float(vec_sim), 6)
        h["lex_score"] = round(float(lex_sim), 6)
        h["explain"] = _explain(row, cons, thr, vec_sim, lex_sim)
        out.append(h)
        if len(out) >= top_k:
            break

    if sort_by == "Giá tăng dần":
        out.sort(key=lambda h: (h.get("price_min_vnd") is None, h.get("price_min_vnd") or 0))
    elif sort_by == "Giá giảm dần":
        out.sort(key=lambda h: (h.get("price_max_vnd") is None, -(h.get("price_max_vnd") or 0)))
    elif sort_by == "Rating giảm dần":
        out.sort(key=lambda h: (h.get("rating") is None, -(h.get("rating") or 0), -(h.get("star") or 0)))

    return out[:top_k]


# =========================
# ANSWER CHAIN (EXPLAINABLE)
# =========================

def build_answer_chain(llm: ChatGoogleGenerativeAI):
    template = """Bạn là Trợ lý Du lịch 3T2M1Stay – trợ lý tư vấn lưu trú am hiểu TP.HCM.
    Bạn luôn trả lời thân thiện, tự nhiên, giàu cảm xúc vừa phải (không sến), và hữu ích.

    DỮ LIỆU ĐẦU VÀO:
    - Câu hỏi: "{user_input}"
    - Danh sách khách sạn (JSON):
    {tool_result_json}

    NGUYÊN TẮC BẮT BUỘC (KHÔNG VI PHẠM):
    1) CHỈ dùng thông tin có trong JSON. Không bịa thêm khách sạn/địa chỉ/thông tin.
    2) Nếu JSON rỗng: xin lỗi ngắn gọn + nói rõ không tìm thấy theo tiêu chí hiện tại + gợi ý 2–3 cách nới tiêu chí.
    3) KHÔNG gợi ý khách sạn thiếu tên hoặc thiếu giá.
    - Tên hợp lệ: "hotelname" hoặc "name" không rỗng.
    - Giá hợp lệ: có "price_min_vnd" hoặc "price_vnd" là số > 0 (hoặc "price_text" khác "chưa cập nhật giá").
      Nếu thiếu giá → loại khỏi gợi ý.
    4) Không nhắc tới “JSON”, “tool”, “RAG” trong câu trả lời.

    CÁCH VIẾT (GIÚP VĂN PHONG PHONG PHÚ):
    - Mở đầu 1–2 câu: xác nhận nhu cầu (khu vực + tiêu chí giá).
    - Mỗi khách sạn: 5–6 dòng, diễn đạt tự nhiên.
    - “Vì sao phù hợp”: viết thành 2–3 gạch đầu dòng dựa trên "match_reason" hoặc "explain".
    - Thêm 1 câu “gợi ý nhanh” phù hợp đối tượng: đi công tác / cặp đôi / đi khám bệnh / gần điểm tiện di chuyển…
      nhưng phải suy ra hợp lý từ JSON (ví dụ: quận, rating, star, mô tả), KHÔNG bịa địa danh.

    ĐỊNH DẠNG TRẢ LỜI:
    PHẦN 1: LỰA CHỌN TỐT NHẤT 🏆
    - 🏨 Tên:
    - 📍 Quận/khu vực:
    - 💰 Giá: {{price_text}}
    - ⭐ Hạng/đánh giá: (nếu có thì ghi; nếu không có thì bỏ)
    - ✨ Điểm nổi bật:
    • (ý 1 từ JSON)
    • (ý 2 từ JSON)
    • (ý 3 nếu có)
    - ✅ Phù hợp nếu bạn: (1 câu ngắn)

    PHẦN 2: CÁC GỢI Ý ĐÁNG CÂN NHẮC 💡 (1–2 khách sạn tiếp theo)
    Mỗi khách sạn 2–3 dòng:
    - 🏨 Tên — 💰 {{price_text}}
    ✨ 1 câu mô tả điểm mạnh dựa trên JSON

    KẾT:
    - 1 câu hỏi chốt để cá nhân hoá: ngân sách tối đa / đi mấy người / cần gần khu nào / ưu tiên rating hay phòng rộng?

    Bắt đầu trả lời:
    """
    prompt = ChatPromptTemplate.from_template(template)
    return prompt | llm | StrOutputParser()


# =========================
# TOOL-LIKE WRAPPER
# =========================

def search_hotels_tool(
    user_query: str,
    df: pd.DataFrame,
    thr: Optional[PriceThresholds],
    vector_db: FAISS,
    lex: LexicalIndex,
    top_k: int = 5,
    filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    hotels = hybrid_search_hotels(
        user_query=user_query,
        df=df,
        thr=thr,
        vector_db=vector_db,
        lex=lex,
        top_k=top_k,
        filters=filters,
    )
    return {"tool_name": "search_hotels_tool", "query": user_query, "results": hotels}


def chat_with_agent(
    user_input: str,
    llm: Optional[ChatGoogleGenerativeAI] = None,
    vector_db: Optional[FAISS] = None,
    df: Optional[pd.DataFrame] = None,
    thr: Optional[PriceThresholds] = None,
    lex: Optional[LexicalIndex] = None,
    filters: Optional[Dict[str, Any]] = None,
    top_k: int = 5,
) -> Dict[str, Any]:
    user_input = (user_input or "").strip()
    if not user_input:
        raise ValueError("user_input trống – hãy nhập câu hỏi.")

    if df is None or thr is None:
        df, thr = load_hotel_dataframe()
    if vector_db is None:
        vector_db = load_vector_db()
    if lex is None:
        lex = build_lexical_index(df, thr)
    if llm is None:
        llm = load_llm()

    tool_result = search_hotels_tool(
        user_query=user_input,
        df=df,
        thr=thr,
        vector_db=vector_db,
        lex=lex,
        top_k=top_k,
        filters=filters,
    )

    answer_chain = build_answer_chain(llm)
    answer_text = answer_chain.invoke(
        {
            "user_input": user_input,
            "tool_result_json": json.dumps(tool_result, ensure_ascii=False, indent=2),
        }
    )
    return {"answer": answer_text, "tool_result": tool_result}


if __name__ == "__main__":
    llm = load_llm()
    vector_db = load_vector_db()
    df, thr = load_hotel_dataframe()
    lex = build_lexical_index(df, thr)

    while True:
        try:
            q = input("Bạn: ")
        except (EOFError, KeyboardInterrupt):
            break
        q = (q or "").strip()
        if not q:
            continue
        if q.lower() in {"exit", "quit"}:
            break

        result = chat_with_agent(q, llm=llm, vector_db=vector_db, df=df, thr=thr, lex=lex, top_k=5)
        print("Assistant:", result["answer"])
        print("-" * 60)
