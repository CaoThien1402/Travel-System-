import os
import re
import json
import ast
from typing import List, Dict, Any, Optional

import pandas as pd
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from prepare_vector_db import _detect_device

# =========================
# CẤU HÌNH
# =========================

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(CURRENT_DIR, "..", "hotels.csv")
VECTOR_DB_PATH = os.path.join(CURRENT_DIR, "vectorstores", "db_faiss")
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")

os.environ["GOOGLE_API_KEY"] = "AIzaSyCbbjUAiOV_k63riaw06248Scho-IOAFw8"

# =========================
# HỖ TRỢ CHUNG
# =========================

def _extract_star_from_row(star_val) -> Optional[int]:
    """Helper lấy số sao từ dữ liệu raw"""
    if pd.isna(star_val): return None
    s = str(star_val).lower()
    m = re.search(r"(\d+)", s)
    return int(m.group(1)) if m else None

def _extract_district_id(district_str) -> Optional[int]:
    """
    Cố gắng lấy số quận nếu có. 
    VD: 'Quận 1, TP.HCM' -> 1
    VD: 'Bình Tân' -> None
    """
    if pd.isna(district_str): return None
    s = str(district_str).lower()
    # Tìm chữ 'quận' hoặc 'district' theo sau là số
    m = re.search(r"(quận|district)\s*0?(\d+)", s)
    if m:
        return int(m.group(2))
    # Trường hợp đặc biệt: "1, Thành phố..."
    m_start = re.match(r"^\s*(\d+)\s*,", s)
    if m_start:
        return int(m_start.group(1))
    return None

def _format_price(price) -> str:
    try:
        p = float(price)
        return f"{p/1_000_000:.2f} tr"
    except:
        return "??"
def _simplify_name(s: str) -> str:
    """Chuẩn hoá tên hotel / câu hỏi để so tên dễ hơn."""
    s = str(s).lower()
    for token in ["khách sạn", "khach san", "hotel"]:
        s = s.replace(token, " ")
    s = " ".join(s.split())
    return s


def _format_price_vnd(vnd: Optional[float]) -> str:
    if vnd is None or vnd != vnd:
        return "không rõ giá"
    million = vnd / 1_000_000
    return f"khoảng {million:.1f} triệu VND/đêm"


def _parse_constraints(query: str) -> Dict[str, Any]:
    """
    Heuristic đơn giản để bắt:
    - quận
    - khoảng giá (triệu)
    - rating tối thiểu
    - số sao tối thiểu
    """
    q = query.lower()
    constraints: Dict[str, Any] = {
        "min_price": None,
        "max_price": None,
        "districts": None,
        "min_rating": None,
        "min_star": None,
        "sort_by": "relevance",
    }

    # Quận
    districts = set()
    for m in re.finditer(r"(quận|quan|district)\s*(\d+)", q):
        districts.add(int(m.group(2)))
    if districts:
        constraints["districts"] = sorted(districts)
    
    # Sao
    stars = []
    for m in re.finditer(r"(\d+)\s*sao", q):
        val = int(m.group(1))
        if 1 <= val <= 5:
            stars.append(val)
    if stars:
        constraints["min_star"] = min(stars)

    # Rating
    rating_nums = []
    for m in re.finditer(r"(\d(?:[.,]\d)?)\s*/\s*5", q):
        rating_nums.append(float(m.group(1).replace(",", ".")))
    if rating_nums:
        constraints["min_rating"] = max(rating_nums)
    else:
        for m in re.finditer(r"(trên|tren|>=|lớn hơn|lon hon)\s*(\d(?:[.,]\d)?)", q):
            num = float(m.group(2).replace(",", "."))
            if 0 <= num <= 5:
                constraints["min_rating"] = max(constraints["min_rating"] or 0, num)

    # Giá: đơn vị "triệu"
    def num_to_vnd(num_str: str) -> int:
        return int(float(num_str.replace(",", ".")) * 1_000_000)

    # "1-2 triệu"
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*triệu", q)
    if m:
        constraints["min_price"] = num_to_vnd(m.group(1))
        constraints["max_price"] = num_to_vnd(m.group(2))

    # "từ 1 triệu đến 2 triệu"
    m = re.search(
        r"từ\s+(\d+(?:[.,]\d+)?)\s*triệu.*?(đến|tới|-)\s*(\d+(?:[.,]\d+)?)\s*triệu", q
    )
    if m:
        constraints["min_price"] = num_to_vnd(m.group(1))
        constraints["max_price"] = num_to_vnd(m.group(3))

    # "dưới 2 triệu"
    m = re.search(r"(dưới|duoi|nhỏ hơn|nho hon|<=)\s*(\d+(?:[.,]\d+)?)\s*triệu", q)
    if m:
        constraints["max_price"] = num_to_vnd(m.group(2))

    # "trên 1.5 triệu", "từ 1.5 triệu"
    m = re.search(r"(trên|tren|từ|tu|>=|lớn hơn|lon hon)\s*(\d+(?:[.,]\d+)?)\s*triệu", q)
    if m:
        constraints["min_price"] = num_to_vnd(m.group(2))

    return constraints


def _merge_constraints(base: Dict[str, Any], override: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Merge với filter từ UI"""
    if not override:
        return base
    merged = dict(base)
    for k, v in override.items():
        if v not in (None, [], "", 0):
            merged[k] = v
    return merged


# =========================
# LOAD LLM / VECTOR / DATA
# =========================

def load_llm() -> ChatGoogleGenerativeAI:
    #  Khởi tạo model Gemini (Google GenAI).
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY chưa được thiết lập. "
            "Hãy export GOOGLE_API_KEY='YOUR_KEY' trước khi chạy."
        )
    return ChatGoogleGenerativeAI(
        model=GEMINI_MODEL_NAME,
        temperature=0.0, # cho chính xác
    )


def load_vector_retriever():
    # Tải cơ sở dữ liệu vector (FAISS) đã được build từ trước
    if not os.path.exists(VECTOR_DB_PATH):
        raise FileNotFoundError(f"Không tìm thấy file DB ở đường dẫn: {VECTOR_DB_PATH}")
    
    device = _detect_device()
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL_NAME,
        model_kwargs={"device": device},
        encode_kwargs={"normalize_embeddings": True},
    )

    db = FAISS.load_local(
        VECTOR_DB_PATH,
        embeddings,
        allow_dangerous_deserialization=True,
    )

    return db.as_retriever(search_kwargs={"k": 16})


def load_hotel_dataframe() -> pd.DataFrame:
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Không tìm thấy CSV: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    # tạo thêm các cột chuẩn hóa để dễ tìm kiếm.
    df["_star_num"] = df["star"].apply(_extract_star_from_row)
    df["_district_num"] = df["district"].apply(_extract_district_id)
    df["hotelname_norm"] = df["hotelname"].astype(str).str.strip().str.lower() 
    df["hotelname_norm_simple"] = df["hotelname"].apply(_simplify_name)
    return df


# =========================
# MAPPING & FILTER
# =========================
# Chuyển một dòng dữ liệu từ Pandas (CSV) thành một Dictionary chuẩn (JSON object) chứa đầy đủ thông tin (tên, giá, ảnh, tiện ích...) để trả về cho người dùng.
def _row_to_hotel(row: pd.Series, match_reason: str = "") -> Dict[str, Any]:
    def safe_get(col):
        return row[col] if col in row else None

    price = safe_get("price")
    rating = safe_get("totalScore")
    star = safe_get("_star_num")

    try:
        price = float(price) if price == price else None
    except Exception:
        price = None
    try:
        rating = float(rating) if rating == rating else None
    except Exception:
        rating = None
    try:
        star = int(star) if star == star else None
    except Exception:
        star = None

    hotel = {
        "hotelname": safe_get("hotelname") or "",
        "address": safe_get("address") or "",
        "district": safe_get("district"),
        "rating": rating,
        "star": star,
        "budget_vnd": price,
        "price_text": _format_price_vnd(price),
        "url": safe_get("url_google") or "",
        "image_url": safe_get("imageUrl") or "",
        "amenities": safe_get("amenities") or "",
        "description": safe_get("description1") or "",
        "reviews": safe_get("reviews") or "",
        "match_reason": match_reason,
    }
    return hotel

def _find_row_by_name(df: pd.DataFrame, name: str) -> Optional[pd.Series]:
    if not name:
        return None
    n = name.strip().lower()
    exact = df[df["hotelname_norm"] == n]
    if len(exact) > 0:
        return exact.iloc[0]
    contains = df[df["hotelname_norm"].str.contains(n, na=False)]
    if len(contains) > 0:
        return contains.iloc[0]
    return None

# Tìm xem trong câu hỏi người dùng có nhắc đích danh tên khách sạn nào không.
def _find_hotels_by_name_in_query(df: pd.DataFrame, query: str, max_results: int = 3) -> pd.DataFrame:
    q_simple = _simplify_name(query)
    if not q_simple:
        return df.iloc[0:0]

    mask = df["hotelname_norm_simple"].apply(
        lambda n: isinstance(n, str) and (n in q_simple or q_simple in n)
    )
    return df[mask].head(max_results)

# Hàm kiểm tra logic (True/False). Một khách sạn có thỏa mãn các điều kiện (giá, quận, sao) đã trích xuất hay không.
def _hotel_pass_constraints(h: Dict[str, Any], cons: Dict[str, Any]) -> bool:
    if cons.get("districts"):
        try:
            d = int(float(h.get("district")))
        except Exception:
            d = None
        if d is None or d not in cons["districts"]:
            return False

    if cons.get("min_price") is not None:
        if h.get("budget_vnd") is None or h["budget_vnd"] < cons["min_price"]:
            return False

    if cons.get("max_price") is not None:
        if h.get("budget_vnd") is None or h["budget_vnd"] > cons["max_price"]:
            return False

    if cons.get("min_rating") is not None:
        if h.get("rating") is None or h["rating"] < cons["min_rating"]:
            return False

    if cons.get("min_star") is not None:
        if h.get("star") is None or h["star"] < cons["min_star"]:
            return False

    return True

# Chuyển kết quả tìm kiếm từ Vector DB (RAG) ngược lại thành thông tin khách sạn đầy đủ từ CSV, đồng thời kiểm tra xem nó có thỏa mãn constraint không.
def _doc_to_hotel(doc, df: pd.DataFrame, cons: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    meta = getattr(doc, "metadata", {}) or {}
    name = meta.get("hotelname") or meta.get("name") or ""
    row = _find_row_by_name(df, name)
    if row is None:
        return None
    hotel = _row_to_hotel(row, match_reason="Kết quả RAG gần với câu hỏi")
    return hotel if _hotel_pass_constraints(hotel, cons) else None


# =========================
# SEARCH HOTEL (CORE)
# =========================

def search_hotels(
    user_query: str,
    df: pd.DataFrame,
    retriever=None,
    top_k: int = 5,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Core search:
    - Bắt tên khách sạn xuất hiện trong câu hỏi (CSV) → LUÔN được ưu tiên, KHÔNG lọc theo slider
    - Áp constraint (quận, giá, rating, sao) cho các gợi ý thêm
    - Bổ sung từ RAG + CSV cho đủ top_k
    """
    constraints = _merge_constraints(_parse_constraints(user_query), filters)
    df_local = df.copy()

    hotels: List[Dict[str, Any]] = []
    seen_names = set()

    # 1) Match theo tên trong câu hỏi: KHÔNG áp constraint (vì user hỏi rõ tên rồi)
    direct_df = _find_hotels_by_name_in_query(df_local, user_query, max_results=top_k)
    for _, row in direct_df.iterrows():
        h = _row_to_hotel(row, match_reason="Tên khách sạn khớp với câu hỏi")
        name = h["hotelname"]
        if name and name not in seen_names:
            seen_names.add(name)
            hotels.append(h)

    # 2) Bổ sung từ retriever (RAG) nếu có – ÁP constraint
    if retriever is not None:
        if hasattr(retriever, "invoke"):
            docs = retriever.invoke(user_query)
        else:
            docs = retriever.get_relevant_documents(user_query)

        for doc in docs:
            h = _doc_to_hotel(doc, df_local, constraints)
            if not h:
                continue
            name = h["hotelname"]
            if name and name not in seen_names:
                seen_names.add(name)
                hotels.append(h)
            if len(hotels) >= top_k * 2:
                break

    # 3) Nếu vẫn thiếu, lấy thêm từ CSV theo filter + rating – dùng to_numeric an toàn
    district_col = pd.to_numeric(df_local["_district_num"], errors="coerce")
    price_col = pd.to_numeric(df_local["price"], errors="coerce")
    rating_col = pd.to_numeric(df_local["totalScore"], errors="coerce")
    star_col = pd.to_numeric(df_local["_star_num"], errors="coerce")

    mask = pd.Series(True, index=df_local.index, dtype=bool)
    if constraints.get("districts"):
        mask &= district_col.round().astype("Int64").isin(constraints["districts"])
    if constraints.get("min_price") is not None:
        mask &= price_col >= constraints["min_price"]
    if constraints.get("max_price") is not None:
        mask &= price_col <= constraints["max_price"]
    if constraints.get("min_rating") is not None:
        mask &= rating_col >= constraints["min_rating"]
    if constraints.get("min_star") is not None:
        mask &= star_col >= constraints["min_star"]

    filtered_df = df_local[mask].copy()
    filtered_df["__rating"] = rating_col[mask]
    filtered_df["__star"] = star_col[mask]
    filtered_df["__price"] = price_col[mask]

    filtered_df = filtered_df.sort_values(
        by=["__rating", "__star", "__price"],
        ascending=[False, False, True],
    )

    for _, row in filtered_df.iterrows():
        h = _row_to_hotel(row, match_reason="Phù hợp tiêu chí lọc")
        name = h["hotelname"]
        if name and name not in seen_names:
            seen_names.add(name)
            hotels.append(h)
        if len(hotels) >= top_k:
            break

    # 4) Sort theo yêu cầu
    sort_by = (filters or {}).get("sort_by") or "relevance"
    if sort_by == "Giá tăng dần":
        hotels.sort(key=lambda h: (h["price_vnd"] is None, h["price_vnd"] or 0))
    elif sort_by == "Giá giảm dần":
        hotels.sort(key=lambda h: (h["price_vnd"] is None, -(h["price_vnd"] or 0)))
    elif sort_by == "Rating giảm dần":
        hotels.sort(
            key=lambda h: (
                h["rating"] is None,
                -(h["rating"] or 0),
                -(h["star"] or 0),
            )
        )
    # "Phù hợp nhất" giữ thứ tự ưu tiên: tên match → RAG → filter CSV

    return hotels[:top_k]


def search_hotels_tool(
    user_query: str,
    retriever,
    df: pd.DataFrame,
    top_k: int = 5,
    filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    hotels = search_hotels(
        user_query=user_query,
        df=df,
        retriever=retriever,
        top_k=top_k,
        filters=filters,
    )
    return {
        "tool_name": "search_hotels_tool",
        "query": user_query,
        "results": hotels,
    }


# =========================
# ANSWER CHAIN
# =========================

def build_answer_chain(llm: ChatGoogleGenerativeAI):
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "Bạn là trợ lý du lịch thông minh, chuyên tư vấn khách sạn tại TP.HCM.\n"
                    "Bạn nhận được:\n"
                    "- Câu hỏi gốc của người dùng\n"
                    "- Kết quả JSON từ TOOL search_hotels_tool (danh sách khách sạn).\n\n"
                    "Yêu cầu:\n"
                    "- Trả lời bằng TIẾNG VIỆT, thân thiện, rõ ràng.\n"
                    "- Nếu JSON chứa khách sạn có 'match_reason' nói rằng tên trùng với câu hỏi, "
                    "hãy ưu tiên trả lời chi tiết về khách sạn đó trước (địa chỉ, giá, rating, sao, điểm nổi bật).\n"
                    "- Sau đó, nếu hợp lý, gợi ý thêm tối đa 2 khách sạn khác phù hợp.\n"
                    "- Nếu danh sách kết quả rỗng, hãy xin lỗi và gợi ý người dùng mô tả cụ thể hơn.\n"
                ),
            ),
            (
                "user",
                (
                    "Câu hỏi của người dùng:\n"
                    "{user_input}\n\n"
                    "Kết quả JSON từ TOOL:\n"
                    "{tool_result_json}\n\n"
                    "Hãy tạo câu trả lời cuối cùng gửi cho người dùng."
                ),
            ),
        ]
    )
    return prompt | llm | StrOutputParser()


# =========================
# API CHO CHATBOT / UI
# =========================

def chat_with_agent(
    user_input: str,
    llm: Optional[ChatGoogleGenerativeAI] = None,
    retriever=None,
    df: Optional[pd.DataFrame] = None,
    filters: Optional[Dict[str, Any]] = None,
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    Trả về cả answer_text và danh sách hotels (dùng cho CLI hoặc UI).
    """
    user_input = (user_input or "").strip()
    if not user_input:
        raise ValueError("user_input trống – hãy nhập câu hỏi.")

    if df is None:
        df = load_hotel_dataframe()
    if llm is None:
        llm = load_llm()
    if retriever is None:
        retriever = load_vector_retriever()

    tool_result = search_hotels_tool(
        user_query=user_input,
        retriever=retriever,
        df=df,
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

    return {
        "answer": answer_text,
        "tool_result": tool_result,
    }


# =========================
# DEMO 
# =========================

if __name__ == "__main__":
    llm = load_llm()
    retriever = load_vector_retriever()
    df = load_hotel_dataframe()

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

        result = chat_with_agent(q, llm=llm, retriever=retriever, df=df, top_k=5)
        print("Assistant:", result["answer"])
        print("-" * 60)
