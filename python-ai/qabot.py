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

CSV_PATH = os.getenv("HOTEL_CSV_PATH") or os.path.join(CURRENT_DIR, "..", "backend", "src", "data", "hotels.csv")
VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH") or os.path.join(CURRENT_DIR, "vectorstores", "db_faiss")

EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash-lite")

# Hybrid weights
W_VEC = float(os.getenv("W_VEC", "0.50"))
W_LEX = float(os.getenv("W_LEX", "0.35"))
W_QUAL = float(os.getenv("W_QUAL", "0.15"))

# ✅ mặc định 10
DEFAULT_TOP_K = int(os.getenv("DEFAULT_TOP_K", "10"))


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
# PRICE PARSING (support range: "490000 - 1150000")
# =========================

def _parse_price_number(piece: str) -> Optional[int]:
    """Parse 1 phần giá sang VND integer."""
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
    """Parse cột price mới: "min - max". Returns: (min_vnd, max_vnd, mid_vnd)"""
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




# =========================
# MEMORY + EXTRA PARSERS (district/price/amenities across turns)
# =========================

# Canonical terms are already accentless + normalized to match _amenities_text_norm
_AMENITY_RULES: List[Tuple[str, List[str]]] = [
    ("ho boi", [r"\bho\s*boi\b", r"\bpool\b"]),
    ("wifi", [r"\bwifi\b", r"\bwi\s*fi\b", r"\binternet\b"]),
    ("bua sang", [r"\bbua\s*sang\b", r"\bbreakfast\b"]),
    ("dau xe", [r"\bdau\s*xe\b", r"\bparking\b", r"\bbai\s*do\b"]),
    ("gym", [r"\bgym\b", r"\bfitness\b", r"\bphong\s*gym\b", r"\bphong\s*tap\b"]),
    ("spa", [r"\bspa\b", r"\bmassage\b"]),
    ("trung tam", [r"\bgan\s*trung\s*tam\b", r"\btrung\s*tam\b", r"\bdowntown\b", r"\bcenter\b"]),
    ("san bay", [r"\bgan\s*san\s*bay\b", r"\bsan\s*bay\b", r"\bairport\b"]),
]

_NEGATION_HEAD = r"(?:khong\s*can|khong\s*muon|khong|ko|k|bo|loai\s*bo|loai)"


def _extract_price_range_from_query(q_norm: str) -> Tuple[Optional[int], Optional[int], bool]:
    """Return (min_vnd, max_vnd, explicit) if query expresses a range like:
    - 'tu 1 den 2 trieu', '1-2 tr', '1~2 trieu', '1000000-2000000'
    """
    qn = q_norm

    # 1) Range with 'trieu/tr/m'
    m = re.search(
        r"(?:\btu\b\s*)?(\d+(?:[\.,]\d+)?)\s*(?:tr|trieu|million|m)\s*(?:den|toi|~|-)\s*(\d+(?:[\.,]\d+)?)\s*(?:tr|trieu|million|m)\b",
        qn,
    )
    if m:
        a = _parse_price_number(m.group(1) + " trieu")
        b = _parse_price_number(m.group(2) + " trieu")
        if a is not None or b is not None:
            lo, hi = (a, b) if (a or 0) <= (b or 0) else (b, a)
            return lo, hi, True

    # 2) Range where only the 2nd number carries unit, ex: "tu 1 den 2 trieu"
    m = re.search(
        r"(?:\btu\b\s*)?(\d+(?:[\.,]\d+)?)\s*(?:den|toi|~|-)\s*(\d+(?:[\.,]\d+)?)\s*(?:tr|trieu|million|m)\b",
        qn,
    )
    if m:
        a = _parse_price_number(m.group(1) + " trieu")
        b = _parse_price_number(m.group(2) + " trieu")
        if a is not None or b is not None:
            lo, hi = (a, b) if (a or 0) <= (b or 0) else (b, a)
            return lo, hi, True

    # 3) Raw VND digits: "1.000.000 - 2.000.000"
    m = re.search(r"(\d[\d\.,]{4,})\s*(?:den|toi|~|-)\s*(\d[\d\.,]{4,})\b", qn)
    if m:
        a = _parse_price_number(m.group(1))
        b = _parse_price_number(m.group(2))
        if a is not None or b is not None:
            lo, hi = (a, b) if (a or 0) <= (b or 0) else (b, a)
            return lo, hi, True

    return None, None, False


def _parse_amenities_from_query(q_norm: str) -> Tuple[List[str], List[str]]:
    """Return (amenities_any, amenities_not) from normalized query."""
    any_terms: List[str] = []
    not_terms: List[str] = []
    qn = _norm_text(q_norm)

    for canon, patterns in _AMENITY_RULES:
        hit = any(re.search(p, qn) for p in patterns)
        if not hit:
            continue

        # Detect negation up to 3 words before canonical term
        neg = re.search(_NEGATION_HEAD + r"(?:\s+\w+){0,3}\s+" + re.escape(canon), qn)
        if neg:
            not_terms.append(canon)
        else:
            any_terms.append(canon)

    # de-dup and resolve conflicts
    any_terms = sorted(set(any_terms))
    not_terms = sorted(set(not_terms))
    any_terms = [t for t in any_terms if t not in not_terms]
    return any_terms, not_terms


def _constraints_from_history(history: Any, thr: Optional[PriceThresholds], max_user_turns: int = 6) -> Dict[str, Any]:
    """Build conversation memory from previous user turns."""
    base = _parse_constraints("", thr)
    if not history:
        return base

    user_texts: List[str] = []
    for h in history:
        if not isinstance(h, dict):
            continue
        role = (h.get("role") or h.get("sender") or "").lower()
        if role in {"user", "human"}:
            c = h.get("content") or h.get("text") or ""
            if isinstance(c, str) and c.strip():
                user_texts.append(c.strip())

    user_texts = user_texts[-max_user_turns:]
    mem = base
    for t in user_texts:
        mem = _merge_constraints(mem, _parse_constraints(t, thr))
    return mem

def _parse_constraints(query: str, thr: Optional[PriceThresholds]) -> Dict[str, Any]:
    """Parse điều kiện từ câu hỏi + hiểu intent 'giá rẻ' theo phân phối dữ liệu."""
    q_raw = query or ""
    q = _strip_accents(q_raw.lower())

    cons: Dict[str, Any] = {
        "min_price": None,
        "max_price": None,
        "district_nums": None,
        "district_names": None,
        "min_rating": None,
        "min_star": None,
        "sort_by": "relevance",
        "price_intent": None,
        "explicit_price": False,
        "require_price": False,
        "amenities_any": [],
        "amenities_not": [],
    }

    nums = set(int(m.group(2)) for m in re.finditer(r"(quận|quan|district)\s*(\d+)", q))
    if nums:
        cons["district_nums"] = sorted(nums)

    stars = []
    for m in re.finditer(r"(\d+)\s*sao", q):
        val = int(m.group(1))
        if 1 <= val <= 5:
            stars.append(val)
    if stars:
        cons["min_star"] = max(stars)

    def num_to_vnd(num_str: str) -> int:
        return int(float(num_str.replace(",", ".")) * 1_000_000)

    # Price range: "từ 1 đến 2 triệu", "1-2tr", "1.000.000-2.000.000"
    lo, hi, is_range = _extract_price_range_from_query(q)
    if is_range:
        cons["min_price"] = lo
        cons["max_price"] = hi
        cons["explicit_price"] = True

    m = re.search(r"(dưới|duoi|<=)\s*(\d+(?:[.,]\d+)?)\s*trieu", q)
    if m:
        cons["max_price"] = num_to_vnd(m.group(2))
        cons["explicit_price"] = True

    m = re.search(r"(trên|tren|từ|tu|>=)\s*(\d+(?:[.,]\d+)?)\s*trieu", q)
    if m:
        cons["min_price"] = num_to_vnd(m.group(2))
        cons["explicit_price"] = True

    # Amenities
    a_any, a_not = _parse_amenities_from_query(q)
    if a_any:
        cons["amenities_any"] = a_any
    if a_not:
        cons["amenities_not"] = a_not

    cheap_terms = ["gia re", "binh dan", "tiet kiem", "economy", "budget", "re"]
    if not cons["explicit_price"] and any(t in q for t in cheap_terms):
        cons["price_intent"] = "gia_re"
        cons["require_price"] = True
        if thr is not None:
            cons["max_price"] = int(thr.q25)
        cons["sort_by"] = "Giá tăng dần"

    return cons


def _merge_constraints(base: Dict[str, Any], override: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Merge constraints with a few special rules:
    - amenities_any / amenities_not: UNION (to keep adding requirements across turns)
    - explicit_price / require_price: OR (once True, keep True)
    - other fields: override when value is meaningful
    """
    if not override:
        return base

    merged = dict(base)

    for k, v in override.items():
        if k in {"amenities_any", "amenities_not"}:
            if isinstance(v, list) and v:
                cur = merged.get(k) or []
                if not isinstance(cur, list):
                    cur = []
                merged[k] = sorted(set([str(x) for x in cur if x] + [str(x) for x in v if x]))
            continue

        if k in {"explicit_price", "require_price"}:
            merged[k] = bool(merged.get(k)) or bool(v)
            continue

        if v not in (None, [], "", 0):
            merged[k] = v

    # Resolve amenity conflicts if any
    if merged.get("amenities_any") and merged.get("amenities_not"):
        merged["amenities_any"] = [t for t in merged["amenities_any"] if t not in set(merged["amenities_not"])]

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
        raise ValueError("GOOGLE_API_KEY chưa được thiết lập. Hãy set GOOGLE_API_KEY trong .env.")
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

    # For amenity filtering (accentless + normalized)
    df["_amenities_text_norm"] = (
        df.get("amenities", "").fillna("").astype(str)
        + " " + df.get("description1", "").fillna("").astype(str)
        + " " + df.get("reviews", "").fillna("").astype(str)
        + " " + df.get("address", "").fillna("").astype(str)
    ).apply(_norm_text)

    df["hotelname_norm"] = df["hotelname"].astype(str).str.strip().str.lower()
    df["hotelname_norm_simple"] = df["hotelname"].apply(
        lambda x: _norm_text(re.sub(r"\b(khach san|khách sạn|hotel)\b", " ", str(x)))
    )

    parsed = df["price"].apply(_parse_price_range)
    df["_price_min_vnd"] = parsed.apply(lambda t: t[0])
    df["_price_max_vnd"] = parsed.apply(lambda t: t[1])
    df["_price_mid_vnd"] = parsed.apply(lambda t: t[2])

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
        ]
        return _norm_text(" ".join(str(p) for p in parts if p))

    corpus = [row_text(r) for _, r in df.iterrows()]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=200_000)
    matrix = vectorizer.fit_transform(corpus)
    row_ids = df.index.to_numpy()
    return LexicalIndex(vectorizer=vectorizer, matrix=matrix, row_ids=row_ids)


def lexical_topk(query: str, lex: LexicalIndex, k: int = 80) -> List[Tuple[int, float]]:
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

    hotel_id = None
    try:
        raw_id = row.get("id")
        hotel_id = int(raw_id) if raw_id == raw_id and raw_id is not None else None
    except Exception:
        hotel_id = None

    image_url = row.get("imageUrl") or ""
    detail_path = f"/properties/{hotel_id}" if hotel_id is not None else ""

    pmin = None
    pmax = None
    try:
        pmin = int(price_min) if price_min == price_min else None
    except Exception:
        pmin = None
    try:
        pmax = int(price_max) if price_max == price_max else None
    except Exception:
        pmax = None

    price_text = _format_price_range_vnd(pmin, pmax)

    return {
        "id": hotel_id,
        "hotelname": row.get("hotelname") or "",
        "name": row.get("hotelname") or "",
        "address": row.get("address") or "",
        "district": row.get("district"),
        "district_num": row.get("_district_num"),
        "rating": rating,
        "star": star,

        "price_vnd": price_mid,
        "budget_vnd": price_mid,

        "price_min_vnd": pmin,
        "price_max_vnd": pmax,
        "price_text": price_text,

        "url_google": row.get("url_google") or "",
        "url": row.get("url_google") or "",
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
    out: Dict[str, str] = {}
    for raw in df["district"].dropna().astype(str).unique().tolist():
        pretty = raw.split(",")[0].strip()
        out[_district_norm(raw)] = pretty
    return out


def _apply_constraints(df: pd.DataFrame, cons: Dict[str, Any]) -> pd.DataFrame:
    mask = pd.Series(True, index=df.index, dtype=bool)

    if cons.get("district_nums"):
        mask &= df["_district_num"].isin(cons["district_nums"])
    elif cons.get("district_names"):
        mask &= df["_district_norm"].isin(cons["district_names"])

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

    if cons.get("require_price") and cons.get("min_price") is None and cons.get("max_price") is None:
        mask &= hotel_min.notna() | hotel_max.notna()

    if cons.get("min_rating") is not None:
        mask &= pd.to_numeric(df["totalScore"], errors="coerce") >= cons["min_rating"]
    if cons.get("min_star") is not None:
        mask &= pd.to_numeric(df["_star_num"], errors="coerce") >= cons["min_star"]

    # Amenities filter (OR semantics for amenities_any)
    if cons.get("amenities_any"):
        col = "_amenities_text_norm"
        if col not in df.columns:
            df[col] = (
                df.get("amenities", "").fillna("").astype(str)
                + " " + df.get("description1", "").fillna("").astype(str)
                + " " + df.get("reviews", "").fillna("").astype(str)
                + " " + df.get("address", "").fillna("").astype(str)
            ).apply(_norm_text)
        m_any = pd.Series(False, index=df.index, dtype=bool)
        for t in cons["amenities_any"]:
            tt = _norm_text(t)
            if tt:
                m_any |= df[col].str.contains(re.escape(tt), na=False)
        mask &= m_any

    if cons.get("amenities_not"):
        col = "_amenities_text_norm"
        if col not in df.columns:
            df[col] = (
                df.get("amenities", "").fillna("").astype(str)
                + " " + df.get("description1", "").fillna("").astype(str)
                + " " + df.get("reviews", "").fillna("").astype(str)
                + " " + df.get("address", "").fillna("").astype(str)
            ).apply(_norm_text)
        for t in cons["amenities_not"]:
            tt = _norm_text(t)
            if tt:
                mask &= ~df[col].str.contains(re.escape(tt), na=False)

    return df[mask].copy()


# =========================
# HYBRID RETRIEVAL + RANKING
# =========================

def _vec_topk(db: FAISS, query: str, k: int = 60) -> List[Tuple[str, float]]:
    out: List[Tuple[str, float]] = []
    for doc, dist in db.similarity_search_with_score(query, k=k):
        meta = getattr(doc, "metadata", {}) or {}
        name = meta.get("hotelname") or ""
        if not name:
            continue
        sim = 1.0 / (1.0 + float(dist))
        out.append((str(name), sim))
    return out


def _find_rows_by_names(df: pd.DataFrame, names: List[str]) -> Dict[str, int]:
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
    return 0.7 * (r / 5.0) + 0.3 * (s / 5.0)


def _price_score(row: pd.Series, cons: Dict[str, Any], thr: Optional[PriceThresholds]) -> float:
    p = row.get("_price_vnd")
    if p is None or (isinstance(p, float) and p != p):
        return 0.15 if (cons.get("max_price") is not None and not cons.get("explicit_price")) else 0.0
    p = float(p)

    if cons.get("min_price") is not None or cons.get("max_price") is not None:
        lo = float(cons.get("min_price") or p)
        hi = float(cons.get("max_price") or p)
        mid = (lo + hi) / 2.0
        denom = max(hi - lo, 1.0)
        d = abs(p - mid) / denom
        return float(max(0.0, 1.0 - d))

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


def hybrid_search_hotels(
    user_query: str,
    df: pd.DataFrame,
    thr: Optional[PriceThresholds],
    vector_db: FAISS,
    lex: LexicalIndex,
    top_k: int = DEFAULT_TOP_K,
    history: Optional[List[Dict[str, Any]]] = None,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:

    mem_cons = _constraints_from_history(history, thr) if history else _parse_constraints("", thr)
    cons = _merge_constraints(mem_cons, _parse_constraints(user_query, thr))
    cons = _merge_constraints(cons, filters)

    if not cons.get("district_nums"):
        name_map = _district_name_candidates(df)
        qn = _norm_text(user_query)
        hit_names = [norm for norm, _pretty in name_map.items() if norm and norm in qn]
        if hit_names:
            cons["district_names"] = sorted(set(hit_names))

    vec = _vec_topk(vector_db, user_query, k=70)
    lex_top = lexical_topk(user_query, lex, k=100)

    vec_names = [n for n, _ in vec]
    vec_name_to_sim: Dict[str, float] = {}
    for n, s in vec:
        vec_name_to_sim[n] = max(vec_name_to_sim.get(n, 0.0), s)

    name_to_idx = _find_rows_by_names(df, vec_names)

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

    df_cons = _apply_constraints(df, cons)
    allowed = set(df_cons.index.tolist())
    cand = {idx: sc for idx, sc in cand.items() if idx in allowed}

    if not cand:
        df_fb = df_cons.copy()
        df_fb["__rating"] = pd.to_numeric(df_fb["totalScore"], errors="coerce")
        df_fb["__star"] = pd.to_numeric(df_fb["_star_num"], errors="coerce")
        df_fb["__price_min"] = pd.to_numeric(df_fb["_price_min_vnd"], errors="coerce").fillna(10**12)
        df_fb = df_fb.sort_values(by=["__rating", "__star", "__price_min"], ascending=[False, False, True])
        out = []
        for _, row in df_fb.head(top_k).iterrows():
            out.append(_row_to_hotel(row, match_reason="Phù hợp tiêu chí lọc"))
        return out

    scored: List[Tuple[int, float]] = []
    for idx, sc in cand.items():
        row = df.loc[idx]
        vec_sim = float(sc.get("vec", 0.0))
        lex_sim = float(sc.get("lex", 0.0))
        qual = _quality_score(row)
        price_sc = _price_score(row, cons, thr)
        total = (W_VEC * vec_sim) + (W_LEX * lex_sim) + (W_QUAL * (0.7 * qual + 0.3 * price_sc))
        scored.append((idx, total))

    scored.sort(key=lambda x: x[1], reverse=True)

    out: List[Dict[str, Any]] = []
    for idx, _total in scored[: max(top_k * 3, top_k)]:
        row = df.loc[idx]
        out.append(_row_to_hotel(row, match_reason="Phù hợp tiêu chí"))
        if len(out) >= top_k:
            break

    sort_by = (filters or {}).get("sort_by") or cons.get("sort_by") or "relevance"
    if sort_by == "Giá tăng dần":
        out.sort(key=lambda h: (h.get("price_min_vnd") is None, h.get("price_min_vnd") or 0))
    elif sort_by == "Giá giảm dần":
        out.sort(key=lambda h: (h.get("price_max_vnd") is None, -(h.get("price_max_vnd") or 0)))
    elif sort_by == "Rating giảm dần":
        out.sort(key=lambda h: (h.get("rating") is None, -(h.get("rating") or 0), -(h.get("star") or 0)))

    return out[:top_k]


# =========================
# ✅ Deterministic list answer (fallback)
# =========================

def _compact_list_answer(hotels: List[Dict[str, Any]]) -> str:
    n = len(hotels)
    lines = [f"Mình đã tìm thấy {n} lựa chọn phù hợp bên dưới:"]
    for i, h in enumerate(hotels, 1):
        name = (h.get("hotelname") or h.get("name") or "").strip()
        district = str(h.get("district") or "—").split(",")[0].strip() or "—"
        price_text = (h.get("price_text") or "chưa cập nhật giá").strip()
        rating = h.get("rating")
        detail = (h.get("detail_url") or h.get("detail_path") or "").strip()

        rating_txt = ""
        try:
            if rating is not None and rating == rating:
                rating_txt = f" — ⭐ {float(rating):.1f}"
        except Exception:
            rating_txt = ""

        link_txt = f" — 🔗 {detail}" if detail else ""
        lines.append(f"({i}) 🏨 {name} — 📍 {district} — 💰 {price_text}{rating_txt}{link_txt}")

    lines.append("Bạn muốn lọc theo *giá*, *rating* hay *tiện ích* (hồ bơi/gần trung tâm/đậu xe)?")
    return "\n".join(lines)


# =========================
# ANSWER CHAIN (prompt)
# =========================

def build_answer_chain(llm: ChatGoogleGenerativeAI):
    # LLM vẫn có thể đếm sai, nên phía dưới sẽ có post-process + fallback
    template = """Bạn là trợ lý gợi ý khách sạn. Chỉ được dùng thông tin trong JSON, không bịa thêm.

Người dùng hỏi: "{user_input}"

DANH SÁCH KHÁCH SẠN (JSON):
{hotels_json}

YÊU CẦU:
- Viết ngắn gọn, sạch sẽ, dễ nhìn.
- Liệt kê đúng tất cả khách sạn trong JSON theo đúng thứ tự có sẵn.
- Mỗi khách sạn đúng 1 dòng, không giải thích dài.

FORMAT:
Mình đã tìm thấy <N> lựa chọn phù hợp bên dưới:
(1) 🏨 <Tên> — 📍 <Quận/Khu> — 💰 <price_text> — ⭐ <rating nếu có> — 🔗 <detail_url nếu có>

QUY TẮC:
- Nếu thiếu rating: bỏ phần ⭐.
- Nếu thiếu price_text: ghi "chưa cập nhật giá".
- Nếu thiếu district: dùng "—".
- Nếu thiếu detail_url: bỏ phần 🔗.
- Kết thúc bằng đúng 1 câu:
  "Bạn muốn lọc theo *giá*, *rating* hay *tiện ích* (hồ bơi/gần trung tâm/đậu xe)?"

Bắt đầu trả lời:
"""
    prompt = ChatPromptTemplate.from_template(template)
    return prompt | llm | StrOutputParser()


# =========================
# TOOL WRAPPER
# =========================

def search_hotels_tool(
    user_query: str,
    df: pd.DataFrame,
    thr: Optional[PriceThresholds],
    vector_db: FAISS,
    lex: LexicalIndex,
    top_k: int = DEFAULT_TOP_K,
    history: Optional[List[Dict[str, Any]]] = None,
    filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    hotels = hybrid_search_hotels(
        user_query=user_query,
        df=df,
        thr=thr,
        vector_db=vector_db,
        lex=lex,
        top_k=top_k,
        history=history,
        filters=filters,
    )
    return {"tool_name": "search_hotels_tool", "query": user_query, "results": hotels}


# =========================
# MAIN ENTRY
# =========================

def chat_with_agent(
    user_input: str,
    llm: Optional[ChatGoogleGenerativeAI] = None,
    vector_db: Optional[FAISS] = None,
    df: Optional[pd.DataFrame] = None,
    thr: Optional[PriceThresholds] = None,
    lex: Optional[LexicalIndex] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    filters: Optional[Dict[str, Any]] = None,
    top_k: int = DEFAULT_TOP_K,
) -> Dict[str, Any]:
    user_input = (user_input or "").strip()
    if not user_input:
        raise ValueError("user_input trống – hãy nhập câu hỏi.")

    # ✅ CHỐT top_k tối đa 10 (để UI luôn consistent)
    try:
        top_k = int(top_k)
    except Exception:
        top_k = DEFAULT_TOP_K
    top_k = max(1, min(10, top_k))

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
        history=history,
        filters=filters,
    )

    hotels = tool_result.get("results") or []
    # ✅ cắt chắc chắn
    hotels = hotels[:top_k]
    tool_result["results"] = hotels
    expected = min(top_k, len(hotels))

    hotels_json = json.dumps(hotels, ensure_ascii=False, indent=2)

    answer_chain = build_answer_chain(llm)
    answer_text = answer_chain.invoke(
        {
            "user_input": user_input,
            "hotels_json": hotels_json,
        }
    )

    answer_text = (answer_text or "").strip()

    # ✅ 1) Đè tiêu đề về đúng expected (LLM hay bịa 11/12)
    answer_text = re.sub(
        r"^Mình đã tìm thấy\s+\d+\s+lựa chọn.*$",
        f"Mình đã tìm thấy {expected} lựa chọn phù hợp bên dưới:",
        answer_text,
        flags=re.MULTILINE,
    )

    # ✅ 2) Nếu số dòng list không đúng expected -> fallback deterministic (luôn đúng)
    got = len(re.findall(r"^\(\d+\)\s", answer_text, flags=re.MULTILINE))
    if expected > 0 and got != expected:
        answer_text = _compact_list_answer(hotels[:expected])

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

        result = chat_with_agent(q, llm=llm, vector_db=vector_db, df=df, thr=thr, lex=lex, top_k=DEFAULT_TOP_K)
        print("Assistant:\n", result["answer"])
        print("-" * 60)
