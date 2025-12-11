import os
import json
import streamlit as st
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI

# --- CẤU HÌNH ---
# Load biến môi trường
load_dotenv()

# --- IMPORT AN TOÀN TỪ QABOT ---
try:
    # Chỉ import những hàm quan trọng nhất định phải có
    from qabot import (
        load_vector_retriever,
        load_hotel_dataframe,
        search_hotels_tool, 
        CSV_PATH,
        GEMINI_MODEL_NAME # Lấy tên model từ qabot để đồng bộ
    )
except ImportError as e:
    st.error(f"❌ LỖI LỚN: Không thể đọc file 'qabot.py'.\nChi tiết lỗi: {e}")
    st.info("💡 Gợi ý: Kiểm tra xem file 'qabot.py' có nằm cùng thư mục với 'app.py' không?")
    st.stop()

# =======================
# 1. CẤU HÌNH GIAO DIỆN
# =======================
st.set_page_config(
    page_title="Hotel Chatbot AI",
    page_icon="🏨",
    layout="wide",
    initial_sidebar_state="expanded"
)

# CSS làm đẹp Card
st.markdown("""
<style>
    div[data-testid="stContainer"] {
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 15px;
        background-color: #ffffff;
    }
    .hotel-title {
        color: #0e1117;
        font-weight: 700;
        font-size: 1.1rem;
        margin-bottom: 5px;
    }
    .price-highlight {
        color: #2ecc71;
        font-weight: bold;
        font-size: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# =======================
# 2. KHỞI TẠO TÀI NGUYÊN
# =======================
@st.cache_resource(show_spinner="Đang khởi động hệ thống...")
def init_resources():
    # 1. Kiểm tra Key
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        st.error("⚠️ LỖI: Chưa có GOOGLE_API_KEY trong file .env")
        st.stop()
        
    try:
        # 2. Tự khởi tạo LLM tại đây (Không phụ thuộc vào qabot nữa)
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL_NAME, # Dùng tên model từ qabot
            google_api_key=api_key,
            temperature=0.7
        )
        
        # 3. Load Dữ liệu từ qabot
        retriever = load_vector_retriever()
        df = load_hotel_dataframe()
        
        return llm, retriever, df
    except Exception as e:
        st.error(f"❌ Lỗi khởi tạo dữ liệu: {e}")
        st.stop()

# =======================
# 3. HÀM HIỂN THỊ CARD
# =======================
def render_hotel_cards(hotels: list):
    if not hotels:
        st.warning("Không tìm thấy khách sạn nào phù hợp với bộ lọc này.")
        return

    st.success(f"🔍 Tìm thấy {len(hotels)} địa điểm:")
    
    cols = st.columns(3)
    for idx, hotel in enumerate(hotels):
        with cols[idx % 3]:
            with st.container():
                # --- ẢNH ---
                # Thử lấy các tên key phổ biến để tránh lỗi
                img = hotel.get("image_url") or hotel.get("image") or hotel.get("imageUrl")
                
                if img and str(img).startswith("http"):
                    st.image(img, use_container_width=True, height=200)
                else:
                    st.image("https://via.placeholder.com/300x200?text=No+Image", use_container_width=True)

                # --- TÊN ---
                name = hotel.get("hotelname") or "Khách sạn chưa đặt tên"
                star = hotel.get("star")
                star_str = f" {'⭐' * int(star)}" if (star and str(star).isdigit() and int(star)>0) else ""
                
                st.markdown(f"<div class='hotel-title'>{name}{star_str}</div>", unsafe_allow_html=True)

                # --- GIÁ & RATING ---
                rating = hotel.get("rating")
                price = hotel.get("price_text") or f"{hotel.get('price', 0):,} VND"
                
                c1, c2 = st.columns([1, 1.5])
                with c1:
                    if rating: st.markdown(f"🌟 **{rating}**")
                with c2:
                    st.markdown(f"<span class='price-highlight'>{price}</span>", unsafe_allow_html=True)
                
                # --- ĐỊA CHỈ ---
                addr = str(hotel.get("address", ""))
                st.caption(f"📍 {addr[:50]}...")
                
                # --- EXPANDER ---
                with st.expander("Xem chi tiết"):
                    if hotel.get("match_reason"):
                        st.info(f"💡 {hotel['match_reason']}")
                    if hotel.get("amenities"):
                        st.markdown(f"**Tiện nghi:** {hotel['amenities']}")
                    if hotel.get("description"):
                        st.text(hotel['description'][:200])

# =======================
# 4. LOGIC CHÍNH
# =======================

# Session State
if "messages" not in st.session_state:
    st.session_state.messages = [{"role": "assistant", "content": "Chào bạn! Bạn cần tìm khách sạn khu vực nào và tầm giá bao nhiêu?"}]

# Load resources
llm, retriever, df_hotels = init_resources()

# --- SIDEBAR ---
with st.sidebar:
    st.header("🔍 Bộ Lọc")
    
    # Lọc Quận (District)
    # Kiểm tra xem có cột district không
    if "district" in df_hotels.columns:
        # Lấy list quận, xử lý string
        raw_list = df_hotels["district"].dropna().astype(str).unique()
        clean_list = sorted(list(set([d.split(",")[0].strip() for d in raw_list])))
        selected_districts = st.multiselect("Khu vực", clean_list)
    else:
        selected_districts = []

    # Lọc Giá
    col_price = "price" if "price" in df_hotels.columns else "budget"
    max_p = 5000000
    try: 
        if col_price in df_hotels.columns: max_p = int(df_hotels[col_price].max())
    except: pass
    
    price_range = st.slider("Giá tối đa (VND)", 0, max_p, (0, max_p), step=100000)

    # Lọc Sao/Rating
    col1, col2 = st.columns(2)
    with col1: min_star = st.selectbox("Sao", [0, 1, 2, 3, 4, 5])
    with col2: min_rating = st.number_input("Điểm >", 0.0, 5.0, 0.0)
    
    if st.button("Làm mới chat", type="primary"):
        st.session_state.messages = []
        st.rerun()

# --- CHAT ---
st.title("🤖 Trợ lý Đặt phòng Khách sạn")

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

if query := st.chat_input("Nhập câu hỏi..."):
    # 1. User
    st.session_state.messages.append({"role": "user", "content": query})
    with st.chat_message("user"):
        st.markdown(query)

    # 2. Assistant
    with st.chat_message("assistant"):
        with st.spinner("Đang tìm kiếm..."):
            try:
                # --- GHÉP QUẬN VÀO CÂU QUERY ---
                # Đây là mẹo quan trọng để RAG hiểu được tên quận dạng chữ (Bình Tân...)
                final_query = query
                if selected_districts:
                    final_query += f". Tìm tại khu vực: {', '.join(selected_districts)}"
                
                # Filters
                filters = {
                    "min_price": price_range[0],
                    "max_price": price_range[1],
                    "min_star": min_star,
                    "min_rating": min_rating
                }

                # Gọi Tool
                result = search_hotels_tool(
                    user_query=final_query,
                    retriever=retriever,
                    df=df_hotels,
                    top_k=6,
                    filters=filters
                )
                
                hotels = result.get("results", [])

                # LLM trả lời
                prompt = ChatPromptTemplate.from_template("""
                Dựa vào danh sách khách sạn: {data}
                Trả lời câu hỏi: "{query}"
                Ngắn gọn, thân thiện. Nếu không có khách sạn, hãy xin lỗi và gợi ý mở rộng tìm kiếm.
                """)
                chain = prompt | llm | StrOutputParser()
                ans = chain.invoke({"query": query, "data": json.dumps(hotels, ensure_ascii=False)})
                
                st.markdown(ans)
                if hotels:
                    st.divider()
                    render_hotel_cards(hotels)
                
                st.session_state.messages.append({"role": "assistant", "content": ans})
                
            except Exception as e:
                st.error(f"Lỗi xử lý: {e}")