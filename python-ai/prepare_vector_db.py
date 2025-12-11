import os
import re
import ast
from typing import List, Optional

import pandas as pd
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.docstore.document import Document
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(CURRENT_DIR, "..", "hotels.csv")
VECTOR_DB_PATH = os.path.join(CURRENT_DIR, "vectorstores", "db_faiss")

def _detect_device() -> str:
    """
    Tự chọn device nếu có GPU, không có thì dùng CPU.
    """
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

def _extract_star(star_str) -> Optional[int]:
    """Rút trích số sao từ chuỗi ví dụ 'Khách sạn 4 sao' -> 4"""
    if pd.isna(star_str):
        return None
    star_str = str(star_str).lower()
    # Tìm con số đứng trước chữ 'sao' hoặc 'star'
    match = re.search(r"(\d+)\s*(sao|star)", star_str)
    if match:
        return int(match.group(1))
    return None
def _price_segment_text(price_vnd: Optional[float]) -> str:
    """Chuyển giá sang phân khúc text để AI hiểu"""
    if price_vnd is None or pd.isna(price_vnd):
        return "giá chưa cập nhật"
    
    million = price_vnd / 1_000_000
    if price_vnd < 500_000:
        segment = "giá rẻ, bình dân"
    elif price_vnd < 1_500_000:
        segment = "tầm trung"
    elif price_vnd < 4_000_000:
        segment = "cao cấp, sang trọng"
    else:
        segment = "siêu sang, luxury"

    return f"Giá tham khảo khoảng {million:.1f} triệu VND/đêm, thuộc phân khúc {segment}."
    
def _clean_list_str(list_str) -> str:
    """Làm sạch chuỗi dạng list ['A', 'B'] thành 'A, B'"""
    if pd.isna(list_str): 
        return ""
    try:
        # Thử parse string thành list
        actual_list = ast.literal_eval(list_str)
        if isinstance(actual_list, list):
            # Lọc bỏ None/Nan và nối lại
            return ", ".join([str(x) for x in actual_list if x])
    except:
        pass
    return str(list_str).strip()
# Biến đổi một dòng Excel khô khan thành một đoạn văn mô tả phong phú.
def _build_hotel_document(row: pd.Series) -> Document:
    hotel_name = str(row.get("hotelname", "")).strip()

    address = str(row.get("address", "")).strip()
    district_raw = str(row.get("district", ""))
    district = district_raw.split(",")[0].strip() if district_raw else ""
    rating = _to_float(row.get("totalScore"))
    reviews_count = _to_int(row.get("reviewsCount"))
    star_raw = row.get("star")
    star = _extract_star(star_raw)
    price = _to_float(row.get("budget"))

    amenities = _clean_list_str(row.get("amenities"))
    reviews_list = _clean_list_str(row.get("reviews"))
    description = str(row.get("description1", "")).replace("nan", "").strip()

    lat = _to_float(row.get("lat"))
    lon = _to_float(row.get("lng"))
    url = str(row.get("url_google", "")).strip()
    image_url = str(row.get("imageUrl", "")).strip()

    # --- Phần TEXT để embedding (page_content) ---
    basic_lines: List[str] = []

    if hotel_name:
        basic_lines.append(f"Khách sạn {hotel_name}.")

    # Hạng sao + rating
    if star is not None and rating is not None:
        if reviews_count is not None:
            basic_lines.append(
                f"Hạng {star} sao, điểm đánh giá trung bình {rating:.1f}/5 từ khoảng {reviews_count} lượt đánh giá."
            )
        else:
            basic_lines.append(
                f"Hạng {star} sao, điểm đánh giá trung bình {rating:.1f}/5."
            )
    elif star is not None:
        basic_lines.append(f"Hạng {star} sao.")
    elif rating is not None:
        basic_lines.append(f"Điểm đánh giá trung bình {rating:.1f}/5.")

    # Khu vực
    if address or district is not None:
        if district is not None:
            # Ghi cả tiếng Việt và English để support query kiểu "District 1"
            basic_lines.append(
                f"Vị trí: Quận {district} (District {district}), địa chỉ: {address}."
            )
        else:
            basic_lines.append(f"Địa chỉ: {address}.")

    # Khoảng giá + phân khúc
    price_text = _price_segment_text(price)
    if price_text:
        basic_lines.append(price_text)

    # Tiện ích & dịch vụ
    if amenities:
        basic_lines.append(f"Tiện ích nổi bật: {amenities}.")
    if reviews_list:
        basic_lines.append(f"Review từ khách hàng: {reviews_list}")

    # Review ngắn (rất quan trọng cho recommendation theo trải nghiệm)
    if description and len(description) > 10:
         basic_lines.append(f"Mô tả: {description}")

    # Ghép thành 1 đoạn mô tả giàu ngữ nghĩa
    full_description = "\n".join(basic_lines)

    # --- Metadata để sau này dễ lọc / hiển thị ---
    metadata = {
        "hotelname": hotel_name,
        "address": address,
        "district": district,
        "rating": rating,
        "reviews_count": reviews_count,
        "star": star,
        "price": price,
        "lat": lat,
        "lon": lon,
        "url": url,
        "image_url": image_url,
    }

    if amenities:
        metadata["amenities"] = amenities
    if reviews_list:
        metadata["reviews_list"] = reviews_list
    if description and len(description) > 10:
        metadata["description"] = description

    return Document(page_content=full_description, metadata=metadata)


def create_db_from_csv(
    csv_path: str = CSV_PATH,
    vector_db_path: str = VECTOR_DB_PATH,
):
    """
    Đọc dữ liệu khách sạn từ CSV, build Document giàu ngữ nghĩa + metadata
    rồi tạo FAISS vector DB để RAG chatbot có ngữ cảnh tốt nhất.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Không tìm thấy file CSV ở đường dẫn: {csv_path}")

    df = pd.read_csv(csv_path)

    # Bỏ các dòng không có tên khách sạn (coi như data lỗi)
    df = df[df["hotelname"].notna()].reset_index(drop=True)

    # Chọn device hợp lý
    device = _detect_device()
    print(f"Khởi tạo embedding model trên device: {device}")

    embedding_model = HuggingFaceEmbeddings(
        model_name=MODEL_NAME,
        model_kwargs={"device": device},
        encode_kwargs={"normalize_embeddings": True},  # phù hợp cho cosine similarity
    )

    # Build danh sách Document
    documents: List[Document] = [
        _build_hotel_document(row) for _, row in df.iterrows()
    ]

    # sẽ cắt nhỏ văn bản một cách thông minh (ngắt ở dấu chấm câu).
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1024,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", "! ", "? ", ", "],
    )
    chunks = text_splitter.split_documents(documents)

    # Đảm bảo thư mục tồn tại
    os.makedirs(os.path.dirname(vector_db_path), exist_ok=True)

    # Tạo và lưu FAISS index
    db = FAISS.from_documents(chunks, embedding_model)
    db.save_local(vector_db_path)
    print(f"Đã build và lưu vector DB tại: {vector_db_path}")
    return db


if __name__ == "__main__":
    create_db_from_csv()
