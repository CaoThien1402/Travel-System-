from typing import Any, Dict, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI()

# -------------------------
# NaN-safe JSON
# -------------------------
def sanitize_for_json(obj: Any) -> Any:
    if obj is None:
        return None
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        v = float(obj)
        return None if (pd.isna(v) or v != v) else v
    if isinstance(obj, float):
        return None if (pd.isna(obj) or obj != obj) else obj
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(x) for x in obj]
    return obj

# -------------------------
# Import qabot
# -------------------------
try:
    from qabot import (
        chat_with_agent,
        load_llm,
        load_vector_db,
        load_hotel_dataframe,
        build_lexical_index,
    )
    _IMPORT_ERROR = None
except Exception as e:
    _IMPORT_ERROR = e

    def chat_with_agent(*args, **kwargs):  # type: ignore
        raise _IMPORT_ERROR

    load_llm = None
    load_vector_db = None
    load_hotel_dataframe = None
    build_lexical_index = None

# -------------------------
# Cache
# -------------------------
LLM = None
VECTOR_DB = None
DF = None
THR = None
LEX = None

@app.on_event("startup")
async def startup():
    global LLM, VECTOR_DB, DF, THR, LEX
    if _IMPORT_ERROR is not None:
        return
    LLM = load_llm()
    VECTOR_DB = load_vector_db()
    DF, THR = load_hotel_dataframe()
    LEX = build_lexical_index(DF, THR)

class ChatRequest(BaseModel):
    query: str
    top_k: Optional[int] = 10
    filters: Optional[Dict[str, Any]] = None

@app.get("/health")
async def health():
    return {"ok": True, "import_error": str(_IMPORT_ERROR) if _IMPORT_ERROR else None}

@app.post("/api/chat")
async def api_chat(req: ChatRequest):
    if _IMPORT_ERROR is not None:
        return JSONResponse(
            status_code=500,
            content={"answer": f"Không import được qabot.py: {_IMPORT_ERROR}", "hotels": []},
        )

    try:
        top_k = int(req.top_k or 10)
    except Exception:
        top_k = 10

    result = chat_with_agent(
        user_input=req.query,
        llm=LLM,
        vector_db=VECTOR_DB,
        df=DF,
        thr=THR,
        lex=LEX,
        filters=req.filters,
        top_k=top_k,
    )

    answer = result.get("answer", "")
    hotels = (result.get("tool_result") or {}).get("results") or []

    return sanitize_for_json({"answer": answer, "hotels": hotels})
