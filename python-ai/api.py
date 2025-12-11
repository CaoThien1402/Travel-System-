import sys
import os
import math
import traceback
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
    # Thêm thư mục hiện tại vào sys.path để tìm thấy qabot.py
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from qabot import chat_with_agent, load_vector_retriever, load_hotel_dataframe
    print("✅ Đã import qabot.")
except ImportError as e:
    print(f"⚠️ Lỗi import qabot: {e}")
    def chat_with_agent(*args, **kwargs): raise e
    load_vector_retriever = None
    load_hotel_dataframe = None

# --- LOAD DATA ---
RETRIEVER = None
DF = None

@app.on_event("startup")
async def startup():
    global RETRIEVER, DF
    try:
        if load_vector_retriever: 
            RETRIEVER = load_vector_retriever()
            print("✅ Đã load Vector DB")
        if load_hotel_dataframe: 
            DF = load_hotel_dataframe()
            print("✅ Đã load CSV")
    except Exception as e:
        print(f"⚠️ Lỗi khởi động (Load Data): {e}")

class ChatRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    print(f"📩 Nhận câu hỏi: {request.query}")
    
    # Gọi hàm AI
    raw_result = chat_with_agent(
        user_input=request.query,
        top_k=request.top_k,
        retriever=RETRIEVER,
        df=DF
    )

    # Xử lý kết quả trả về
    answer = "Không có câu trả lời"
    hotels = []

    if isinstance(raw_result, dict):
        answer = raw_result.get("answer", str(raw_result))
        tool_res = raw_result.get("tool_result", {})
        if isinstance(tool_res, dict):
            hotels = tool_res.get("results", [])
        elif isinstance(tool_res, list):
            hotels = tool_res
    else:
        answer = str(raw_result)

   
    # Gói dữ liệu vào dict cuối cùng và lọc sạch
    final_response = {
        "answer": answer,
        "hotels": hotels
    }
    
    clean_response = sanitize_for_json(final_response)
    
    return clean_response

# Chạy: uvicorn api:app --host 0.0.0.0 --port 8000