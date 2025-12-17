"""
Semantic Search CLI - Gọi từ Node.js backend
Sử dụng Vietnamese Embedding Model + Cosine Similarity

Usage:
    python semantic_search.py --query "khách sạn gần biển" --top_k 10
    python semantic_search.py --create-embeddings
"""

import os
import sys
import json
import argparse
import numpy as np
import pandas as pd

# Đường dẫn
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(CURRENT_DIR, "..", "data")
CSV_PATH = os.path.join(DATA_DIR, "hotels.csv")
EMBEDDINGS_PATH = os.path.join(CURRENT_DIR, "hotel_embeddings.npy")

# Model name
EMBEDDING_MODEL_NAME = "AITeamVN/Vietnamese_Embedding"

# Biến global để cache model và data (tránh load lại mỗi lần)
_tokenizer = None
_model = None
_device = None
_cached_df = None
_cached_embeddings = None


def get_device():
    """Xác định device (CUDA hoặc CPU)."""
    import torch
    return "cuda" if torch.cuda.is_available() else "cpu"


def load_model():
    """Load Vietnamese Embedding model (lazy loading)."""
    global _tokenizer, _model, _device
    
    if _tokenizer is None or _model is None:
        import torch
        from transformers import AutoTokenizer, AutoModel
        
        _device = get_device()
        print(f"Loading model on {_device}...", file=sys.stderr)
        
        _tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
        _model = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)
        _model.to(_device)
        _model.eval()
        
        # Optimize cho inference nhanh hơn
        if hasattr(torch, 'compile') and _device == 'cuda':
            try:
                _model = torch.compile(_model, mode='reduce-overhead')
                print("Model compiled for faster inference!", file=sys.stderr)
            except Exception:
                pass  # Fallback nếu compile không support
        
        print("Model loaded successfully!", file=sys.stderr)
    
    return _tokenizer, _model, _device


def mean_pooling(model_output, attention_mask):
    """Tính mean pooling cho sentence embedding."""
    import torch
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)


def encode_texts(texts, tokenizer, model, device):
    """Encode danh sách texts thành embeddings - optimized for speed."""
    import torch
    import torch.nn.functional as F
    
    # Giảm max_length xuống 64 để nhanh hơn 4x
    # Query search thường rất ngắn (5-10 từ) nên 64 tokens là quá đủ
    encoded_input = tokenizer(
        texts, 
        padding=True, 
        truncation=True, 
        return_tensors='pt', 
        max_length=64  # Giảm từ 128 xuống 64 cho query ngắn
    )
    encoded_input = {k: v.to(device) for k, v in encoded_input.items()}
    
    # Sử dụng inference_mode thay vì no_grad cho nhanh hơn
    with torch.inference_mode():
        model_output = model(**encoded_input)
    
    embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
    embeddings = F.normalize(embeddings, p=2, dim=1)
    
    return embeddings.cpu().numpy()


def safe_str(x):
    """Chuyển đổi giá trị thành string an toàn."""
    if isinstance(x, list):
        return ' '.join([str(i) for i in x if pd.notna(i)])
    elif pd.isna(x):
        return ''
    else:
        return str(x)


def parse_star_rating(x):
    """Parse star rating an toàn từ nhiều format."""
    if pd.isna(x):
        return ''
    
    x_str = str(x).lower().strip()
    
    # Nếu đã là số
    try:
        star_num = int(float(x))
        if 1 <= star_num <= 5:
            return f'{star_num} sao'
        return ''
    except (ValueError, TypeError):
        pass
    
    # Parse từ text như "Khách sạn 3 sao", "3 sao", "3 star"
    import re
    match = re.search(r'(\d+)\s*(sao|star)', x_str)
    if match:
        star_num = int(match.group(1))
        if 1 <= star_num <= 5:
            return f'{star_num} sao'
    
    return ''


def safe_price(x):
    """Parse price an toàn."""
    if pd.isna(x):
        return ''
    try:
        return str(int(float(x)))
    except (ValueError, TypeError):
        return ''


def create_embeddings():
    """Tạo embeddings cho tất cả khách sạn và lưu file."""
    import torch
    import torch.nn.functional as F
    
    print("Creating hotel embeddings...", file=sys.stderr)
    
    # Load model
    tokenizer, model, device = load_model()
    
    # Load CSV
    df = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df)} hotels from {CSV_PATH}", file=sys.stderr)
    
    # Tạo text cho mỗi khách sạn
    def get_col(name):
        return df[name] if name in df.columns else pd.Series([''] * len(df))
    
    df['all_text'] = (
        get_col('hotelname').apply(safe_str) + ' ' +
        get_col('address').apply(safe_str) + ' ' +
        get_col('searchString').apply(safe_str) + ' ' +
        get_col('description1').apply(safe_str) + ' ' +
        get_col('description2').apply(safe_str) + ' ' +
        get_col('price').apply(safe_price) + ' ' +
        get_col('star').apply(parse_star_rating) + ' ' +
        get_col('amenities').apply(safe_str) + ' ' +
        get_col('reviews').apply(safe_str)
    ).str.strip()
    
    all_texts = df['all_text'].tolist()
    
    # Tạo embeddings theo batch - tăng batch size để nhanh hơn
    embeddings = []
    batch_size = 64  # Tăng từ 32 lên 64 để xử lý nhanh hơn
    
    for i in range(0, len(all_texts), batch_size):
        batch_texts = all_texts[i:i+batch_size]
        batch_embeddings = encode_texts(batch_texts, tokenizer, model, device)
        embeddings.append(batch_embeddings)
        
        progress = min(i + batch_size, len(all_texts))
        print(f"Processed {progress}/{len(all_texts)} hotels...", file=sys.stderr)
    
    # Ghép và normalize
    hotel_embeddings = np.vstack(embeddings)
    hotel_embeddings = hotel_embeddings / np.linalg.norm(hotel_embeddings, axis=1, keepdims=True)
    
    # Lưu file
    np.save(EMBEDDINGS_PATH, hotel_embeddings)
    print(f"Saved embeddings to {EMBEDDINGS_PATH}", file=sys.stderr)
    
    return {"success": True, "message": f"Created embeddings for {len(df)} hotels", "path": EMBEDDINGS_PATH}


def search(query, top_k=20, min_price=None, max_price=None, min_star=None, district=None):
    """Tìm kiếm khách sạn bằng semantic search."""
    global _cached_df, _cached_embeddings
    
    # Kiểm tra embeddings file
    if not os.path.exists(EMBEDDINGS_PATH):
        return {"success": False, "error": "Embeddings file not found. Run with --create-embeddings first."}
    
    # Load data with caching (chỉ load 1 lần, lần sau dùng cache)
    if _cached_df is None or _cached_embeddings is None:
        print("Loading CSV and embeddings (first time)...", file=sys.stderr)
        _cached_df = pd.read_csv(CSV_PATH)
        _cached_embeddings = np.load(EMBEDDINGS_PATH)
    
    df = _cached_df
    hotel_embeddings = _cached_embeddings
    
    # Kiểm tra số lượng
    if len(hotel_embeddings) != len(df):
        return {"success": False, "error": f"Embeddings mismatch: {len(hotel_embeddings)} vs {len(df)} hotels"}
    
    # Parse star column thành integer để có thể filter
    def extract_star_number(x):
        """Extract số sao từ text hoặc số"""
        if pd.isna(x):
            return 0
        try:
            return int(float(x))
        except (ValueError, TypeError):
            import re
            match = re.search(r'(\d+)', str(x))
            if match:
                return int(match.group(1))
            return 0
    
    if 'star' in df.columns:
        df['star_int'] = df['star'].apply(extract_star_number)
    else:
        df['star_int'] = 0
    
    # Parse price column - handle ranges like "300000 - 750000"
    def parse_price(price_val):
        if pd.isna(price_val):
            return 0
        try:
            price_str = str(price_val).strip()
            if '-' in price_str:
                # Price range: take average
                parts = price_str.split('-')
                min_p = float(parts[0].strip())
                max_p = float(parts[1].strip())
                return (min_p + max_p) / 2
            else:
                return float(price_str)
        except (ValueError, AttributeError):
            return 0
    
    if 'price' in df.columns:
        df['price_numeric'] = df['price'].apply(parse_price)
    else:
        df['price_numeric'] = 0
    
    # Load model
    tokenizer, model, device = load_model()
    
    # Filter theo tiêu chí cứng
    filter_mask = pd.Series([True] * len(df))
    
    if min_price is not None:
        filter_mask &= (df['price_numeric'] >= min_price)
    
    if max_price is not None:
        filter_mask &= (df['price_numeric'] <= max_price)
    
    if min_star is not None and min_star > 0:
        filter_mask &= (df['star_int'] >= min_star)
    
    if district and district != 'Tất cả':
        district_col = df.get('district', pd.Series([''] * len(df)))
        filter_mask &= district_col.str.contains(district, case=False, na=False)
    
    filtered_indices = df[filter_mask].index.to_numpy()
    
    if len(filtered_indices) == 0:
        return {"success": True, "query": query, "total": 0, "hotels": []}
    
    filtered_embeddings = hotel_embeddings[filtered_indices]
    
    # Encode query
    query_embedding = encode_texts([query], tokenizer, model, device)
    
    # Tính cosine similarity - dùng numpy dot nhanh hơn sklearn
    # Embeddings đã normalize nên dot product = cosine similarity
    similarities = np.dot(filtered_embeddings, query_embedding.T).flatten()
    
    # Lấy top-k - dùng argpartition nhanh hơn argsort khi k nhỏ
    top_k = min(top_k, len(filtered_indices))
    if top_k < len(filtered_indices):
        # argpartition nhanh hơn khi chỉ cần top k
        top_indices_in_filtered = np.argpartition(similarities, -top_k)[-top_k:]
        top_indices_in_filtered = top_indices_in_filtered[np.argsort(similarities[top_indices_in_filtered])[::-1]]
    else:
        top_indices_in_filtered = similarities.argsort()[::-1]
    
    top_scores = similarities[top_indices_in_filtered]
    top_original_indices = filtered_indices[top_indices_in_filtered]
    
    # Xây dựng kết quả
    results = []
    for rank, (orig_idx, score) in enumerate(zip(top_original_indices, top_scores), 1):
        row = df.iloc[orig_idx]
        
        # Parse star rating an toàn
        star_value = row.get('star', 0)
        star_int = 0
        if pd.notna(star_value):
            try:
                star_int = int(float(star_value))
            except (ValueError, TypeError):
                # Nếu là text như "Khách sạn 3 sao", extract số
                import re
                star_str = str(star_value)
                match = re.search(r'(\d+)', star_str)
                if match:
                    star_int = int(match.group(1))
        
        # Parse price - handle price ranges like "300000 - 750000"
        price_value = 0
        if pd.notna(row.get('price')):
            try:
                price_str = str(row.get('price', 0)).strip()
                if '-' in price_str:
                    # Price range: take average
                    parts = price_str.split('-')
                    min_price = float(parts[0].strip())
                    max_price = float(parts[1].strip())
                    price_value = (min_price + max_price) / 2
                else:
                    price_value = float(price_str)
            except (ValueError, AttributeError):
                price_value = 0
        
        hotel = {
            "id": int(orig_idx) + 1,
            "hotelname": safe_str(row.get('hotelname', '')),
            "address": safe_str(row.get('address', '')),
            "district": safe_str(row.get('district', '')),
            "price": price_value,
            "star": star_int,
            "lat": float(row.get('lat', 0)) if pd.notna(row.get('lat')) else 0,
            "lon": float(row.get('lon', 0)) if pd.notna(row.get('lon')) else 0,
            "imageUrl": safe_str(row.get('imageUrl', '')),
            "similarity_score": float(score),
            "rank": rank
        }
        
        # Optional fields
        if 'totalScore' in row.index and pd.notna(row['totalScore']):
            hotel['totalScore'] = float(row['totalScore'])
        if 'reviewsCount' in row.index and pd.notna(row['reviewsCount']):
            hotel['reviewsCount'] = int(row['reviewsCount'])
        
        results.append(hotel)
    
    return {
        "success": True,
        "query": query,
        "total": len(results),
        "hotels": results
    }


def main():
    parser = argparse.ArgumentParser(description='Semantic Search CLI for Hotel Search Bar')
    parser.add_argument('--query', type=str, help='Search query')
    parser.add_argument('--top_k', type=int, default=20, help='Number of results')
    parser.add_argument('--min_price', type=float, help='Minimum price')
    parser.add_argument('--max_price', type=float, help='Maximum price')
    parser.add_argument('--min_star', type=int, help='Minimum star rating')
    parser.add_argument('--district', type=str, help='District filter')
    parser.add_argument('--create-embeddings', action='store_true', help='Create embeddings file')
    
    args = parser.parse_args()
    
    if args.create_embeddings:
        result = create_embeddings()
    elif args.query:
        result = search(
            query=args.query,
            top_k=args.top_k,
            min_price=args.min_price,
            max_price=args.max_price,
            min_star=args.min_star,
            district=args.district
        )
    else:
        result = {"success": False, "error": "No action specified. Use --query or --create-embeddings"}
    
    # Set UTF-8 encoding cho stdout (fix lỗi trên Windows)
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
    
    # Output JSON để Node.js parse
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
