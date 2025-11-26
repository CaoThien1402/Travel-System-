import streamlit as st
import pandas as pd
import numpy as np
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity
import folium
from streamlit_folium import folium_static
import requests
import time
import torch
import torch.nn.functional as F
from CreateVectorEmbeddings import encode_batch, create_vector_embeddings
import os

# Cấu hình trang
st.set_page_config(
    page_title="3T2M1STAY",
    page_icon="🏨",
    layout="wide"
)

# Constants
NOMINATIM = "https://nominatim.openstreetmap.org"
OSRM = "https://router.project-osrm.org"
UA = {"User-Agent": "Hotel-Finder-Streamlit/1.0"}

DISTRICTS = [
    "Tất cả",
    "Quận 1", "Quận 3", "Quận 4", "Quận 5",
    "Quận 6", "Quận 7", "Quận 8", "Quận 10",
    "Quận 11", "Quận 12", "Thành phố Thủ Đức", "Quận Bình Thạnh", "Quận Tân Bình",
    "Quận Tân Phú", "Quận Phú Nhuận", "Quận Gò Vấp",
    "Quận Bình Tân", "Huyện Bình Chánh", "Huyện Hóc Môn",
    "Huyện Củ Chi", "Huyện Nhà Bè", "Huyện Cần Giờ"
]

ACCOMMODATION_TYPES = ["Tất cả", "khách sạn", "resort", "homestay"]

# Caching functions
@st.cache_resource
def load_model():
    tokenizer = AutoTokenizer.from_pretrained('AITeamVN/Vietnamese_Embedding')
    model = AutoModel.from_pretrained('AITeamVN/Vietnamese_Embedding')
    return tokenizer, model

@st.cache_data
def load_data(): 
    if not os.path.exists('hotels.csv'):
        st.error("Không tìm thấy file hotels.csv!")
        return None, None
    
    df = pd.read_csv('hotels.csv')
    
    if not os.path.exists('hotel_embeddings.npy'):
        st.warning("Đang tạo embeddings... Vui lòng đợi")
        create_vector_embeddings()
    
    embeddings = np.load('hotel_embeddings.npy')
    return df, embeddings

def geocode(q):
    time.sleep(1.0)
    try:
        r = requests.get(
            f"{NOMINATIM}/search",
            params={"q": q, "format": "jsonv2", "limit": 1},
            headers=UA,
            timeout=10
        )
        r.raise_for_status()
        j = r.json()
        if not j:
            return 10.7626, 106.6822, q
        return float(j[0]["lat"]), float(j[0]["lon"]), j[0].get("display_name", q)
    except:
        return 10.7626, 106.6822, q

def osrm_geom(lon1, lat1, lon2, lat2):
    try:
        r = requests.get(
            f"{OSRM}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}",
            params={"overview": "full", "geometries": "geojson"},
            headers=UA,
            timeout=30
        )
        r.raise_for_status()
        data = r.json()
        return data["routes"][0]["geometry"]
    except:
        return {"coordinates": [[lon1, lat1], [lon2, lat2]]}

def filter_hotels(df, district, price_range, accommodation_type, star_rating):
    filtered_df = df.copy()
    if district != "Tất cả":
        filtered_df = filtered_df[
            filtered_df['address'].str.contains(district, case=False, na=False)
        ]
    filtered_df = filtered_df[
        (filtered_df['price'] >= price_range[0]) & 
        (filtered_df['price'] <= price_range[1])
    ]
    if accommodation_type != "Tất cả":
        filtered_df = filtered_df[
            filtered_df['hotelname'].str.contains(accommodation_type, case=False, na=False) |
            filtered_df['searchString'].str.contains(accommodation_type, case=False, na=False)
        ]
    if star_rating != "Tất cả":
        filtered_df = filtered_df[filtered_df['star'] == int(float(star_rating))]
    return filtered_df

def search_hotels(query, df, embeddings, tokenizer, model, top_k=10):
    if len(df) == 0:
        return pd.DataFrame()
    
    df_reset = df.reset_index(drop=True)
    # Lấy indices tương ứng với embeddings
    df_indices = df.index.to_numpy()
    filtered_embeddings = embeddings[df_indices]
    
    query_embedding = encode_batch([query], tokenizer, model).numpy()
    similarities = cosine_similarity(query_embedding, filtered_embeddings)
    
    top_k = min(top_k, len(df))
    top_indices = similarities.argsort()[0][-top_k:][::-1]
    top_scores = similarities[0][top_indices]
    
    result_df = df_reset.iloc[top_indices].copy()
    result_df['score'] = top_scores
    return result_df

def create_map(recommendations, user_location):
    user_lat, user_lon, _ = geocode(user_location)
    
    if len(recommendations) == 0:
        m = folium.Map(location=[user_lat, user_lon], zoom_start=13)
    else:
        center_lat = recommendations["lat"].mean()
        center_lon = recommendations["lon"].mean()
        m = folium.Map(location=[center_lat, center_lon], zoom_start=12)
    
    folium.Marker(
        [user_lat, user_lon],
        popup="<b>Vị trí của bạn</b>",
        icon=folium.Icon(color='red', icon='home', prefix='fa')
    ).add_to(m)
    
    for idx, row in recommendations.iterrows():
        popup_html = f"""
        <div style="width: 200px;">
            <h4>{row['hotelname']}</h4>
            <p><b>Địa chỉ:</b> {row['address']}</p>
            <p><b>Sao:</b> {row.get('star', 'N/A')} ⭐</p>
            <p><b>Giá:</b> {row.get('price', 0):,.0f} VNĐ</p>
            <p><b>Score:</b> {row.get('score', 0):.3f}</p>
        </div>
        """
        folium.Marker(
            [row["lat"], row["lon"]],
            popup=folium.Popup(popup_html, max_width=250),
            icon=folium.Icon(color='blue', icon='hotel', prefix='fa')
        ).add_to(m)
        try:
            geom = osrm_geom(user_lon, user_lat, row["lon"], row["lat"])
            latlon = [(lat, lon) for lon, lat in geom["coordinates"]]
            folium.PolyLine(latlon, color='blue', weight=3, opacity=0.6).add_to(m)
        except:
            pass
    return m

# Main App
def main():
    st.title("🏨 Hệ Thống Tìm Khách Sạn TP.HCM")
    
    # Load data
    with st.spinner("Đang tải dữ liệu..."):
        df, embeddings = load_data()
        tokenizer, model = load_model()
    if df is None:
        st.stop()
    
    # Sidebar filters
    st.sidebar.header("🔍 Bộ Lọc")
    user_location = st.sidebar.text_input(
        "📍 Vị trí của bạn",
        value="Trường Đại học Khoa học Tự nhiên, TP.HCM"
    )
    st.sidebar.markdown("---")
    
    district = st.sidebar.selectbox("🏙️ Quận/Huyện", options=DISTRICTS)
    
    min_price = int(df['price'].min())
    max_price = int(df['price'].max())
    price_range = st.sidebar.slider(
        "💰 Khoảng giá (VNĐ)",
        min_value=min_price,
        max_value=max_price,
        value=(min_price, max_price),
        step=100000,
        format="%d"
    )
    
    accommodation_type = st.sidebar.selectbox("🏠 Loại chỗ ở", options=ACCOMMODATION_TYPES)
    
    star_options = ["Tất cả"] + [str(i) for i in sorted(df['star'].unique()) if pd.notna(i)]
    star_rating = st.sidebar.selectbox("⭐ Số sao", options=star_options)
    
    top_k = st.sidebar.slider("📊 Số kết quả hiển thị", 5, 20, 10, 5)
    st.sidebar.markdown("---")
    st.sidebar.info(f"📍 Tổng số khách sạn: {len(df)}")
    
    st.markdown("### 🔎 Tìm kiếm khách sạn")
    col1, col2 = st.columns([4,1])
    with col1:
        search_query = st.text_input(
            "",
            placeholder="Nhập mô tả khách sạn bạn muốn tìm (VD: khách sạn gần sân bay, có hồ bơi, view đẹp...)",
            label_visibility="collapsed"
        )
    with col2:
        search_button = st.button("🔍 Tìm kiếm", use_container_width=True, type="primary")
    
    filtered_df = filter_hotels(df, district, price_range, accommodation_type, star_rating)
    st.info(f"Tìm thấy **{len(filtered_df)}** khách sạn phù hợp với bộ lọc")
    
    if search_button and search_query:
        with st.spinner("Đang tìm kiếm..."):
            results = search_hotels(search_query, filtered_df, embeddings, tokenizer, model, top_k)
        if len(results) == 0:
            st.warning("Không tìm thấy khách sạn phù hợp.")
        else:
            st.markdown("### 🗺️ Bản đồ khách sạn")
            map_obj = create_map(results, user_location)
            folium_static(map_obj, width=1200, height=500)
            
            st.markdown("### 📋 Danh sách khách sạn")
            for idx, row in results.iterrows():
                with st.expander(f"🏨 {row['hotelname']} - Score: {row['score']:.3f}"):
                    col1, col2 = st.columns([2,1])
                    with col1:
                        st.write(f"**📍 Địa chỉ:** {row['address']}")
                        st.write(f"**⭐ Số sao:** {row.get('star', 'N/A')}")
                        st.write(f"**💰 Giá:** {row.get('price', 0):,.0f} VNĐ")
                        if 'amenities' in row and pd.notna(row['amenities']):
                            st.write(f"**🏊 Tiện nghi:** {row['amenities']}")
                        if 'reviews' in row and pd.notna(row['reviews']):
                            st.write(f"**💬 Đánh giá:** {row['reviews'][:200]}{'...' if len(str(row['reviews']))>200 else ''}")
                    with col2:
                        st.metric("Độ phù hợp", f"{row['score']:.1%}")
    
    elif not search_query and len(filtered_df) > 0:
        st.markdown("### 🏆 Top khách sạn theo bộ lọc")
        display_df = filtered_df.head(top_k).copy()
        if len(display_df) > 0:
            display_df['score'] = 1.0
            map_obj = create_map(display_df, user_location)
            folium_static(map_obj, width=1200, height=500)
            for idx, row in display_df.iterrows():
                with st.expander(f"🏨 {row['hotelname']}"):
                    col1, col2 = st.columns([2,1])
                    with col1:
                        st.write(f"**📍 Địa chỉ:** {row['address']}")
                        st.write(f"**⭐ Số sao:** {row.get('star', 'N/A')}")
                        st.write(f"**💰 Giá:** {row.get('price', 0):,.0f} VNĐ")
                        if 'amenities' in row and pd.notna(row['amenities']):
                            st.write(f"**🏊 Tiện nghi:** {row['amenities']}")
                    with col2:
                        st.metric("Độ phù hợp", f"{row.get('score', 0):.1%}")

if __name__ == "__main__":
    main()
