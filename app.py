# app.py
import os
import json
from typing import Any, Dict, List, Tuple, Optional

import requests
import pandas as pd
import streamlit as st

from qabot import (
    load_llm,
    load_vector_retriever,
    load_hotel_dataframe,
    search_hotels_tool,
    build_answer_chain,
    _simplify_name,  # dùng lại hàm normalize tên của bạn
)

# =======================
# PAGE CONFIG
# =======================
st.set_page_config(
    page_title="Smart Accommodation Chatbot",
    page_icon="🏨",
    layout="wide",
)


# =======================
# CACHE TÀI NGUYÊN
# =======================
@st.cache_resource(show_spinner=True)
def init_resources() -> Tuple[Any, Any, Any, Any]:
    """Khởi tạo LLM, retriever, DataFrame khách sạn và answer_chain."""
    llm = load_llm()
    retriever = load_vector_retriever()
    df = load_hotel_dataframe()
    answer_chain = build_answer_chain(llm)
    return llm, retriever, df, answer_chain


# =======================
# IMAGE UTILITIES
# =======================
def _is_valid_image_url(url: str) -> bool:
    if not url:
        return False
    url = str(url).strip()
    if url.lower() in {"0", "none", "nan", "null"}:
        return False
    return url.startswith("http://") or url.startswith("https://")


@st.cache_data(show_spinner=False)
def _fetch_image_bytes(url: str) -> Optional[bytes]:
    try:
        resp = requests.get(url, timeout=6)
        if resp.status_code == 200:
            return resp.content
    except Exception:
        pass
    return None


# =======================
# TÁCH KẾT QUẢ THEO CÂU TRẢ LỜI
# =======================
def _split_hotels_by_answer(
    hotels: List[Dict[str, Any]],
    answer_text: str,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Tách danh sách hotel thành:
    - main_hotels: tên xuất hiện trong answer_text
    - extra_hotels: còn lại.
    Nếu không bắt được hotel nào trong answer_text thì trả lại toàn bộ ở main_hotels.
    """
    if not hotels:
        return [], []

    answer_simple = _simplify_name(answer_text or "")

    main_hotels: List[Dict[str, Any]] = []
    extra_hotels: List[Dict[str, Any]] = []

    for h in hotels:
        name = (h.get("hotelname") or "").strip()
        if not name:
            extra_hotels.append(h)
            continue
        name_simple = _simplify_name(name)
        if name_simple and name_simple in answer_simple:
            main_hotels.append(h)
        else:
            extra_hotels.append(h)

    # Nếu LLM không nhắc tới hotel nào thì cứ hiển thị hết như cũ
    if not main_hotels:
        return hotels, []

    return main_hotels, extra_hotels


# =======================
# RENDER HOTEL CARDS (KHÔNG HTML THÔ)
# =======================
def render_hotel_cards(hotels: List[Dict[str, Any]]):
    """Hiển thị danh sách khách sạn bằng component Streamlit thuần."""
    if not hotels:
        st.info("Không tìm thấy khách sạn phù hợp để hiển thị.")
        return

    cols_per_row = 3
    for i in range(0, len(hotels), cols_per_row):
        row_hotels = hotels[i : i + cols_per_row]
        cols = st.columns(len(row_hotels))

        for col, hotel in zip(cols, row_hotels):
            with col:
                name = hotel.get("hotelname") or "Khách sạn không tên"
                district = hotel.get("district") or "N/A"
                price_text = hotel.get("price_text") or "Giá chưa rõ"
                rating = hotel.get("rating")
                star = hotel.get("star")
                address = hotel.get("address") or ""
                url = hotel.get("url") or ""
                image1 = hotel.get("image1") or ""
                reason = hotel.get("match_reason") or ""
                facilities = hotel.get("facilities") or ""
                services = hotel.get("service") or ""

                # ẢNH
                if _is_valid_image_url(image1):
                    img_bytes = _fetch_image_bytes(image1)
                    if img_bytes:
                        st.image(img_bytes, caption=name, use_container_width=True)

                # THÔNG TIN CƠ BẢN
                st.markdown(f"**{name}**")
                st.caption(f"Quận {district}")
                if address:
                    st.markdown(f"📍 {address}")
                st.markdown(f"💰 {price_text}")

                # SAO + RATING
                star_text = ""
                try:
                    if star not in (None, "", float("nan")):
                        star_int = int(float(star))
                        if star_int > 0:
                            star_text = "⭐" * star_int
                except Exception:
                    pass

                rating_text = ""
                try:
                    if rating not in (None, "", float("nan")):
                        rating_val = float(rating)
                        rating_text = f" | Rating {rating_val:.1f}/5"
                except Exception:
                    pass

                if star_text or rating_text:
                    st.markdown(f"{star_text}{rating_text}")

                # LÝ DO MATCH
                if reason:
                    st.markdown(f"`{reason}`")

                # TIỆN ÍCH / DỊCH VỤ (rút gọn)
                if facilities:
                    fac_str = str(facilities)
                    short = fac_str[:140] + ("..." if len(fac_str) > 140 else "")
                    st.markdown(f"**Tiện ích:** {short}")

                if services:
                    srv_str = str(services)
                    short = srv_str[:140] + ("..." if len(srv_str) > 140 else "")
                    st.markdown(f"**Dịch vụ nổi bật:** {short}")

                # LINK
                if url:
                    st.markdown(f"[🔗 Xem chi tiết]({url})")


# =======================
# SESSION STATE
# =======================
if "messages" not in st.session_state:
    st.session_state.messages = []  # [{"role", "content"}]


# =======================
# LOAD LLM & DATA
# =======================
with st.spinner("Đang khởi tạo mô hình & dữ liệu..."):
    llm, retriever, df_hotels, answer_chain = init_resources()

# Chuẩn hoá cột budget để lấy khoảng giá an toàn
budget_series = pd.to_numeric(df_hotels["budget"], errors="coerce")
max_budget_vnd = float(
    budget_series.max() if budget_series.max() == budget_series.max() else 0.0
)
max_budget_million = max(3, int(max_budget_vnd / 1_000_000) + 1)

# Chuẩn hoá cột district để build danh sách quận
district_series = pd.to_numeric(df_hotels["district"], errors="coerce")
district_vals = district_series.dropna().round().astype(int).unique().tolist()
district_vals = sorted(district_vals)


# =======================
# SIDEBAR (FILTER)
# =======================
with st.sidebar:
    st.markdown("### ⚙️ Cấu hình tìm kiếm")

    st.markdown(
        """
        Ứng dụng tư vấn chỗ ở thông minh dùng **RAG + Tool + Gemini**.

        - Dữ liệu: `district1.csv`  
        - Vector DB: FAISS + MiniLM  
        - LLM: Gemini (langchain-google-genai)
        """
    )

    api_key_input = st.text_input(
        "Google API Key (tuỳ chọn)",
        type="password",
        help="Nếu để trống, hệ thống dùng GOOGLE_API_KEY từ môi trường.",
    )
    if api_key_input:
        os.environ["GOOGLE_API_KEY"] = api_key_input

    st.markdown("---")

    selected_districts = st.multiselect(
        "Chọn quận mong muốn",
        options=district_vals,
        format_func=lambda d: f"Quận {d}",
    )

    # Price range (triệu VND)
    price_min_m, price_max_m = st.slider(
        "Khoảng giá (triệu VND / đêm)",
        min_value=0.0,
        max_value=float(max_budget_million),
        value=(0.0, float(max_budget_million)),
        step=0.5,
    )

    # Rating & star
    min_rating = st.slider(
        "Điểm đánh giá tối thiểu",
        min_value=0.0,
        max_value=5.0,
        value=0.0,
        step=0.1,
    )

    min_star = st.slider(
        "Số sao tối thiểu",
        min_value=0,
        max_value=5,
        value=0,
        step=1,
    )

    sort_by = st.selectbox(
        "Sắp xếp kết quả",
        ["Phù hợp nhất", "Giá tăng dần", "Giá giảm dần", "Rating giảm dần"],
    )

    top_k = st.slider(
        "Số khách sạn hiển thị (tối đa)",
        min_value=1,
        max_value=10,
        value=3,
        step=1,
        help="Logic search_hotels sẽ ưu tiên: tên khách sạn trùng câu hỏi → kết quả RAG → lọc CSV.",
    )

    st.markdown("---")
    st.markdown(
        """
        💡 **Gợi ý câu hỏi**  
        - *Khách sạn giá rẻ ở quận 1, rating trên 4.0*  
        - *Silverland Sakyo giá bao nhiêu 1 đêm?*  
        - *Cho mình vài khách sạn 3–4 sao gần trung tâm*  
        """
    )


# =======================
# HEADER
# =======================
st.markdown(
    """
    <style>
    .main-title {
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 0;
    }
    .sub-title {
        font-size: 14px;
        color: #6b7280;
        margin-top: 4px;
        margin-bottom: 18px;
    }
    .filter-chip {
        display:inline-block;
        padding:2px 8px;
        margin-right:4px;
        margin-bottom:4px;
        border-radius:999px;
        background:#e5e7eb;
        font-size:11px;
        color:#374151;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown('<p class="main-title">🏨 Smart Accommodation Chatbot</p>', unsafe_allow_html=True)
st.markdown(
    '<p class="sub-title">Hỏi bất kỳ điều gì về khách sạn / chỗ ở tại TP.HCM, tôi sẽ gợi ý dựa trên dữ liệu thực tế.</p>',
    unsafe_allow_html=True,
)

# Hiển thị tóm tắt filter dưới title
active_filters_html = ""

if selected_districts:
    districts_str = ", ".join([f"Q{d}" for d in selected_districts])
    active_filters_html += f'<span class="filter-chip">Khu vực: {districts_str}</span>'

if price_min_m > 0 or price_max_m < max_budget_million:
    active_filters_html += (
        f'<span class="filter-chip">Giá: {price_min_m:.1f}–{price_max_m:.1f}M</span>'
    )

if min_rating > 0:
    active_filters_html += f'<span class="filter-chip">Rating ≥ {min_rating:.1f}</span>'

if min_star > 0:
    active_filters_html += f'<span class="filter-chip">Sao ≥ {min_star}</span>'

if sort_by and sort_by != "Phù hợp nhất":
    active_filters_html += f'<span class="filter-chip">Sắp xếp: {sort_by}</span>'

if active_filters_html:
    st.markdown(active_filters_html, unsafe_allow_html=True)
    st.markdown("")  # spacing


# =======================
# LỊCH SỬ CHAT
# =======================
chat_container = st.container()
with chat_container:
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])


# =======================
# CHAT INPUT
# =======================
user_input = st.chat_input("Nhập câu hỏi về khách sạn của bạn...")

if user_input:
    user_input = user_input.strip()
    if user_input:
        # hiển thị câu hỏi của user
        st.session_state.messages.append({"role": "user", "content": user_input})
        with st.chat_message("user"):
            st.markdown(user_input)

        # build filter dict để truyền xuống tool
        filters: Dict[str, Any] = {
            "districts": selected_districts or None,
            "min_price": int(price_min_m * 1_000_000) if price_min_m > 0 else None,
            "max_price": int(price_max_m * 1_000_000)
            if price_max_m < max_budget_million
            else None,
            "min_rating": min_rating if min_rating > 0 else None,
            "min_star": min_star if min_star > 0 else None,
            "sort_by": sort_by,
        }

        # assistant message
        with st.chat_message("assistant"):
            with st.spinner("Đang suy nghĩ..."):
                try:
                    tool_result = search_hotels_tool(
                        user_query=user_input,
                        retriever=retriever,
                        df=df_hotels,
                        top_k=top_k,
                        filters=filters,
                    )

                    answer_text = answer_chain.invoke(
                        {
                            "user_input": user_input,
                            "tool_result_json": json.dumps(
                                tool_result, ensure_ascii=False, indent=2
                            ),
                        }
                    )
                except Exception as e:
                    answer_text = f"Xin lỗi, đã có lỗi xảy ra: {e}"
                    tool_result = {"results": []}

                st.markdown(answer_text)
                st.session_state.messages.append(
                    {"role": "assistant", "content": answer_text}
                )

                hotels = tool_result.get("results", [])
                if hotels:
                    main_hotels, extra_hotels = _split_hotels_by_answer(
                        hotels, answer_text
                    )

                    st.markdown("**✨ Gợi ý chỗ ở phù hợp từ dữ liệu:**")
                    render_hotel_cards(main_hotels)

                    if extra_hotels:
                        with st.expander(
                            "Xem thêm một vài gợi ý khác từ dữ liệu (không được nhắc trong câu trả lời)",
                            expanded=False,
                        ):
                            render_hotel_cards(extra_hotels)
                else:
                    st.info(
                        "Hiện chưa tìm được khách sạn phù hợp với câu hỏi / bộ lọc. "
                        "Bạn có thể mô tả cụ thể hơn (khu vực, ngân sách, số sao, nhu cầu...)."
                    )
