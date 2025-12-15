import sys
import os
import math
import traceback
from typing import Any, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI()

# --- HÀM DỌN DẸP DỮ LIỆU (FIX LỖI NaN) ---
def sanitize_for_json(obj):
    """
    Đệ quy đi qua toàn bộ dữ liệu.
    Nếu gặp NaN (Not a Number) hoặc Infinity -> Đổi thành None (null trong JSON).
    """
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(i) for i in obj]
    return obj

# --- BẮT LỖI TOÀN CỤC ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"Lỗi Server Python: {str(exc)}"
    print(f"❌ {error_msg}")
    print(traceback.format_exc())
    return JSONResponse(
        status_code=200,
        content={
            "answer": error_msg,
            "hotels": []
        }
    )

# --- IMPORT LOGIC ---
try:
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))

    # Code mới trong qabot.py
    from qabot import (
        chat_with_agent,
        load_hotel_dataframe,
        load_vector_db,
        build_lexical_index,
        load_llm,
    )
    print("✅ Đã import qabot (new).")
except ImportError as e:
    print(f"⚠️ Lỗi import qabot: {e}")
    def chat_with_agent(*args, **kwargs):  # type: ignore
        raise e

    load_hotel_dataframe = None
    load_vector_db = None
    build_lexical_index = None
    load_llm = None

# --- LOAD DATA (cache) ---
VECTOR_DB = None
DF = None
THR = None
LEX = None
LLM = None

@app.on_event("startup")
async def startup():
    global VECTOR_DB, DF, THR, LEX, LLM
    try:
        if load_hotel_dataframe:
            DF, THR = load_hotel_dataframe()
            print("✅ Đã load CSV + thresholds")

        if load_vector_db:
            VECTOR_DB = load_vector_db()
            print("✅ Đã load Vector DB")

        if build_lexical_index and DF is not None:
            LEX = build_lexical_index(DF, THR)
            print("✅ Đã build Lexical Index (TF-IDF)")

        if load_llm:
            # Lưu ý: cần export GOOGLE_API_KEY trước khi chạy server
            LLM = load_llm()
            print("✅ Đã load LLM")

    except Exception as e:
        print(f"⚠️ Lỗi khởi động (Load Data): {e}")
        print(traceback.format_exc())

class ChatRequest(BaseModel):
    query: str
    top_k: int = 5
    # Cho phép truyền filter từ UI (tuỳ bạn dùng hay không)
    # Ví dụ: {"district_nums":[5], "max_price": 500000, "sort_by":"Giá tăng dần"}
    filters: Optional[Dict[str, Any]] = None

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    print(f"📩 Nhận câu hỏi: {request.query}")

    raw_result = chat_with_agent(
        user_input=request.query,
        top_k=request.top_k,
        llm=LLM,                # cache LLM
        vector_db=VECTOR_DB,    # cache FAISS
        df=DF,                  # cache dataframe
        thr=THR,                # cache thresholds
        lex=LEX,                # cache lexical index
        filters=request.filters # optional
    )

    answer = "Không có câu trả lời"
    hotels = []

    if isinstance(raw_result, dict):
        answer = raw_result.get("answer", str(raw_result))
        tool_res = raw_result.get("tool_result", {})
        # tool_res có dạng {"tool_name":..., "query":..., "results"🙁...]}
        if isinstance(tool_res, dict):
            hotels = tool_res.get("results", [])
        elif isinstance(tool_res, list):
            hotels = tool_res
    else:
        answer = str(raw_result)

    final_response = {
        "answer": answer,
        "hotels": hotels
    }
    return sanitize_for_json(final_response)
