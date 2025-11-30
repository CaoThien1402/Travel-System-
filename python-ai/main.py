#pip install -r requirements.txt

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from transformers import AutoTokenizer, AutoModel
from CreateVectorEmbeddings import encode_batch, create_vector_embeddings
from map import create_map

def filter_by_budget_location(df, budget=None, location=None):
    if budget is not None:
        df = df[df['budget'] <= budget]
    if location is not None:
        df = df[df['address'].str.contains(location, case=False, na=False)]
    return df


def get_recommendation(query, hotel_embeddings, df, tokenizer, model, k, budget=None, location=None):
    filter_df = filter_by_budget_location(df, budget, location)

    indices = filter_df.index.to_numpy()       # chỉ số trong df gốc
    filtered_embeddings = hotel_embeddings[indices]

    query_embedding = encode_batch([query], tokenizer, model).numpy() # tạo sentence embedding cho câu truy vấn

    similarities = cosine_similarity(query_embedding, filtered_embeddings) # dùng thuật toán tính toán độ tương đồng cosine giữa câu truy vấn và tất cả các vector embedding mỗi khách sạn

    top_indices = similarities.argsort()[0][-k:][::-1] # lấy ra chỉ số của k khách sạn có độ tương đồng cao nhất
    top_scores = similarities[0][top_indices] # lấy ra điểm số tương ứng với k khách sạn trên
    
    top_hotels = filter_df.iloc[top_indices].copy() 
    top_hotels['score'] = top_scores # thêm cột điểm số vào dataframe kết quả

    print("=== Top Recommendations ===")
    for i, (idx, score) in enumerate(zip(top_indices, top_scores), 1): #zip thành từng cặp (chỉ số hotel, điểm tương ứng) sau đó enumerate bắt đầu từ 1
        hotel_name = df.iloc[idx]['hotelname']
        hotel_address = df.iloc[idx]['address']
        print(f"{i}. {hotel_name}, Address: {hotel_address} -> similarity score: {score:.4f}")   
    return top_hotels


def main():
    # gọi hàm create_vector_embeddings nếu chưa có file hotel_embeddings.npy lưu vector embeddings của all khách sạn
    #create_vector_embeddings()
    df = pd.read_csv('hotels.csv')
    hotel_embeddings = np.load('hotel_embeddings.npy')

    tokenizer = AutoTokenizer.from_pretrained('AITeamVN/Vietnamese_Embedding')
    model = AutoModel.from_pretrained('AITeamVN/Vietnamese_Embedding')
    query = input("Searching hotel: ")
    
    recommendations = get_recommendation(query, hotel_embeddings, df, tokenizer, model, 5)
    recommendations
    create_map(recommendations)

if __name__ == "__main__":
    main()
