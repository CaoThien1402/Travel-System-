import os
from typing import List, Optional

import pandas as pd
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.docstore.document import Document
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter



MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
CSV_PATH = "data/district1.csv"
VECTOR_DB_PATH = "vectorstores/db_faiss"


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


def _price_segment_text(price_vnd: Optional[float]) -> str:
    """
    Chuyển giá VND sang mô tả ngữ nghĩa (giá rẻ / tầm trung / cao cấp)
    để embedding dễ match với câu hỏi như "giá rẻ", "tầm trung", ...
    """
    if price_vnd is None:
        return ""

    million = price_vnd / 1_000_000
    if price_vnd < 1_000_000:
        segment = "giá rẻ"
    elif price_vnd < 3_000_000:
        segment = "tầm trung"
    else:
        segment = "cao cấp"

    return (
        f"Giá tham khảo khoảng {million:.1f} triệu VND/đêm, thuộc phân khúc {segment}."
    )

# Biến đổi một dòng Excel khô khan thành một đoạn văn mô tả phong phú.
def _build_hotel_document(row: pd.Series) -> Document:
    hotel_name = str(row.get("hotelname", "")).strip()

    address = str(row.get("address", "")).strip()
    district = _to_int(row.get("district"))
    rating = _to_float(row.get("rating"))
    count_rating = _to_int(row.get("count_rating"))
    star = _to_int(row.get("star"))
    budget = _to_float(row.get("budget"))
    time_info = str(row.get("time", "")).strip()

    facilities = str(row.get("facilities", "")).strip()
    service = str(row.get("service", "")).strip()
    review = str(row.get("review", "")).strip()

    lat = _to_float(row.get("lat"))
    lon = _to_float(row.get("lon"))
    url = str(row.get("URL", "")).strip()
    image1 = str(row.get("image1", "")).strip()
    image2 = str(row.get("image2", "")).strip()

    # --- Phần TEXT để embedding (page_content) ---
    basic_lines: List[str] = []

    if hotel_name:
        basic_lines.append(f"Khách sạn {hotel_name}.")

    # Hạng sao + rating
    if star is not None and rating is not None:
        if count_rating is not None:
            basic_lines.append(
                f"Hạng {star} sao, điểm đánh giá trung bình {rating:.1f}/5 từ khoảng {count_rating} lượt đánh giá."
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
    price_text = _price_segment_text(budget)
    if price_text:
        basic_lines.append(price_text)

    # Thời gian hoạt động / thông tin thêm
    if time_info:
        basic_lines.append(f"Thông tin thêm: {time_info}.")

    # Tiện ích & dịch vụ
    if facilities:
        basic_lines.append(f"Tiện ích nổi bật: {facilities}.")
    if service:
        basic_lines.append(f"Chất lượng dịch vụ: {service}.")

    # Review ngắn (rất quan trọng cho recommendation theo trải nghiệm)
    if review:
        basic_lines.append(f"Nhận xét của khách: {review}")

    # Ghép thành 1 đoạn mô tả giàu ngữ nghĩa
    full_description = "\n".join(basic_lines)

    # --- Metadata để sau này dễ lọc / hiển thị ---
    metadata = {
        "hotelname": hotel_name,
        "address": address,
        "district": district,
        "rating": rating,
        "count_rating": count_rating,
        "star": star,
        "budget": budget,
        "lat": lat,
        "lon": lon,
        "url": url,
        "image1": image1,
        "image2": image2,
    }

    if facilities:
        metadata["facilities"] = facilities
    if service:
        metadata["service"] = service

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
