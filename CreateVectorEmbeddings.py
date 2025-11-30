import pandas as pd
import numpy as np
from transformers import AutoTokenizer, AutoModel
import torch
import torch.nn.functional as F

# hàm dùng để tinh giá trị trung bình của toàn bộ token embeddings trong câu => sentence embedding
def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]  # lấy last_hidden_state (chứa tất cả token embeddings)
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float() # tạo mask cùng kích thước với số phần từ trong 1 token embeddings để khi nhân với token embeddings sẽ giữ nguyên giá trị của token thực và biến các token padding thành 0 
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9) # lấy trung bình cộng các token embeddings (đã nhân với mask) theo chiều 1 (chiều các token trong câu)


# hàm tạo sentence embeddings cho một câu
def encode_batch(batch_texts, tokenizer, model):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    encoded_input = tokenizer(batch_texts, padding=True, truncation=True, return_tensors='pt') # tạo token ids
    encoded_input = {k: v.to(device) for k, v in encoded_input.items()}
    with torch.no_grad(): # ko tính toán gradient để tiết kiệm bộ nhớ
        model_output = model(**encoded_input) # tạo các token embeddings
    batch_embeddings = mean_pooling(model_output, encoded_input['attention_mask']) # tính sentence embedding
    batch_embeddings = F.normalize(batch_embeddings, p=2, dim=1) # chuẩn hóa sentence embedding theo từng hàng (dim=1) để dễ tính cosine similarity 
    return batch_embeddings


def safe_str_skip_nan(x):
    if isinstance(x, list):
        # lọc NaN trong list luôn
        return ' '.join([str(i) for i in x if pd.notna(i)])
    elif pd.isna(x):
        return ''  # bỏ qua NaN
    else:
        return str(x)


def create_vector_embeddings():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    df = pd.read_csv('hotels.csv')

    df['all'] = (
        df['hotelname'].apply(safe_str_skip_nan) + ' ' +
        df['address'].apply(safe_str_skip_nan) + ' ' +
        df['searchString'].apply(safe_str_skip_nan) + ' ' +
        df['description1'].apply(safe_str_skip_nan) + ' ' +
        df['description2'].apply(safe_str_skip_nan) + ' ' +
        df['price'].apply(lambda x: str(int(x)) if pd.notna(x) else '') + ' ' +
        df['star'].apply(lambda x: str(int(x)) if pd.notna(x) else '') + ' sao ' +
        df['amenities'].apply(safe_str_skip_nan) + ' ' +
        df['reviews'].apply(safe_str_skip_nan)
    )

    df['all'] = df['all'].str.strip()

    all_texts = df['all'].tolist()

    #khởi tạo tokenizer và mô hình transformer từ Hugging Face
    tokenizer = AutoTokenizer.from_pretrained('AITeamVN/Vietnamese_Embedding')
    model = AutoModel.from_pretrained('AITeamVN/Vietnamese_Embedding')
    model.to(device) 

    embeddings = [] # tạo mảng chứa các sentence embeddings
    batch_size = 32
    
    for i in range(0, len(all_texts), batch_size):
        batch_texts = all_texts[i:i+batch_size]
        batch_embeddings = encode_batch(batch_texts, tokenizer, model)
        embeddings.append(batch_embeddings)

    hotel_embeddings = torch.cat(embeddings) # ghép tất cả các sentence embeddings lại thành một tensor lớn
    hotel_embeddings = F.normalize(hotel_embeddings, p=2, dim=1) # chuẩn hóa toàn bộ sentence embeddings
    hotel_embeddings = hotel_embeddings.numpy() # chuyển thành mảng rong numpy

    np.save('hotel_embeddings.npy', hotel_embeddings)