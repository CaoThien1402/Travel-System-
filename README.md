# 🏨 3T2M1Stay - Hệ Thống Tìm Kiếm Khách Sạn TP.HCM

> **Đồ án môn học:** Computational Thinking  
> **Ngôn ngữ:** TypeScript, Python  
> **Nhóm:** 3T2M1

---

## 📌 Giới Thiệu

**3T2M1Stay** là website tìm kiếm khách sạn tại TP. Hồ Chí Minh với **AI Chatbot** thông minh, cho phép người dùng tìm kiếm bằng ngôn ngữ tự nhiên (tiếng Việt).

**Điểm nổi bật:**
- Tìm kiếm thông minh bằng AI (RAG + Hybrid Search)
- Bản đồ tương tác hiển thị vị trí khách sạn
- Giao diện hiện đại, responsive
- Xác thực người dùng qua Supabase

---

## ✨ Tính Năng Chi Tiết

### 🏠 Trang Chủ (`/`)
- **Hero Section**: Banner với ảnh nền đẹp, widget thời tiết TP.HCM (API Open-Meteo)
- **SearchBar**: Form tìm kiếm nhanh (điểm đến, ngày, số khách)
- **Featured Hotels**: 6 khách sạn nổi bật (4.5+ sao, nhiều đánh giá)

### 🔍 Tìm Kiếm (`/search`)
- **Bộ lọc đa dạng**: Quận/Huyện, khoảng giá, số sao, loại nơi ở
- **Semantic Search**: Tìm kiếm ngữ nghĩa bằng Python embeddings
- **Bản đồ Leaflet**: Hiển thị vị trí khách sạn, marker tùy chỉnh
- **Tìm quanh tôi**: Lọc khách sạn trong bán kính 3km từ vị trí người dùng
- **Phân trang**: 20 khách sạn/trang

### 🤖 Smart Search (`/smart-search`)
- **AI Chatbot toàn màn hình**: Giao diện chat kiểu ChatGPT
- **Lưu lịch sử hội thoại**: LocalStorage
- **Markdown Response**: Hiển thị kết quả dạng bảng, list
- **Hotel Cards**: Hiển thị khách sạn gợi ý với ảnh, giá, rating

### 🏨 Chi Tiết Khách Sạn (`/properties/:id`)
- **Thông tin đầy đủ**: Tên, địa chỉ, giá, số sao, mô tả
- **Ảnh khách sạn**: Fallback nếu ảnh lỗi
- **Tiện ích**: Icons cho WiFi, bể bơi, gym, spa, nhà hàng...
- **Bản đồ nhỏ**: Vị trí khách sạn + các địa điểm lân cận (POI)
- **Breadcrumb**: Điều hướng dễ dàng

### ❤️ Wishlist (`/wishlist`) - Yêu cầu đăng nhập
- **Lưu khách sạn yêu thích**: Đồng bộ với Supabase database
- **Quản lý danh sách**: Thêm/xóa khách sạn
- **Xem nhanh thông tin**: Tên, giá, quận, số sao

### 👤 Tài Khoản
- **Đăng ký/Đăng nhập**: Email + Password qua Supabase Auth
- **Profile**: Cập nhật họ tên, số điện thoại, địa chỉ
- **Dashboard**: Tổng quan tài khoản người dùng
- **Protected Routes**: Bảo vệ các trang cần xác thực

### 💬 Chatbot Popup
- **Floating button**: Góc phải màn hình
- **Chat nhanh**: Không cần chuyển trang
- **Gợi ý khách sạn**: Hiển thị cards có thể click

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend (React + Vite)
| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| Tailwind CSS | 3.x | Styling |
| Shadcn/UI | latest | Component Library |
| React Router | 6.x | Routing |
| TanStack Query | 5.x | Data Fetching |
| Leaflet | 1.9.x | Bản đồ tương tác |
| React Markdown | 9.x | Render markdown |
| Supabase JS | 2.x | Auth Client |

### Backend (Node.js + Express)
| Công nghệ | Mục đích |
|-----------|----------|
| Express | API Server |
| TypeScript | Type Safety |
| csv-parser | Đọc file CSV |
| Supabase Admin | Database + Auth |
| child_process | Gọi Python script |

### Python AI Server (FastAPI)
| Công nghệ | Mục đích |
|-----------|----------|
| FastAPI + Uvicorn | API Server |
| LangChain | AI Framework |
| Google Gemini | LLM (gemini-2.5-flash-lite) |
| FAISS | Vector Database |
| HuggingFace | Sentence Embeddings (all-MiniLM-L6-v2) |
| TF-IDF (sklearn) | Lexical Search |
| Pandas + NumPy | Xử lý dữ liệu |

---

## 📁 Cấu Trúc Thư Mục

```
Travel-System-/
│
├── frontend/                    # React Frontend (Port 8080)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx       # Thanh điều hướng
│   │   │   ├── Hero.tsx         # Banner + Weather widget
│   │   │   ├── SearchBar.tsx    # Form tìm kiếm
│   │   │   ├── Chatbot.tsx      # Popup chatbot
│   │   │   ├── HotelMap.tsx     # Bản đồ danh sách
│   │   │   ├── HotelDetailMap.tsx # Bản đồ chi tiết + POI
│   │   │   ├── PropertyCard.tsx # Card khách sạn
│   │   │   ├── FeaturedProperties.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── ui/              # Shadcn components
│   │   ├── pages/
│   │   │   ├── Index.tsx        # Trang chủ
│   │   │   ├── HotelSearch.tsx  # Tìm kiếm + bản đồ
│   │   │   ├── SmartSearch.tsx  # AI Chat (912 lines)
│   │   │   ├── HotelDetail.tsx  # Chi tiết khách sạn
│   │   │   ├── Wishlist.tsx     # Danh sách yêu thích
│   │   │   ├── Login.tsx        # Đăng nhập
│   │   │   ├── Register.tsx     # Đăng ký
│   │   │   ├── Profile.tsx      # Hồ sơ cá nhân
│   │   │   ├── Dashboard.tsx    # Dashboard
│   │   │   └── About.tsx        # Giới thiệu
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Quản lý auth state
│   │   ├── lib/
│   │   │   ├── supabase.ts      # Supabase client + helpers
│   │   │   └── utils.ts         # Utilities (cn, formatters)
│   │   └── hooks/
│   │       └── use-toast.ts     # Toast notifications
│   └── package.json
│
├── backend/                     # Node.js Backend (Port 5000)
│   ├── src/
│   │   ├── index.ts             # Express server entry
│   │   ├── supabase.ts          # Supabase admin client
│   │   ├── routes/
│   │   │   ├── auth.ts          # Đăng ký/Đăng nhập
│   │   │   ├── properties.ts    # CRUD khách sạn
│   │   │   ├── chat.ts          # Chat proxy
│   │   │   ├── wishlist.ts      # Wishlist CRUD
│   │   │   └── semanticSearch.ts # Gọi Python script
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT verification
│   │   ├── utils/
│   │   │   └── csvReader.ts     # Đọc + cache CSV
│   │   ├── data/
│   │   │   └── hotels.csv       # 103 khách sạn
│   │   └── python/
│   │       └── semantic_search.py # Embedded search
│   └── package.json
│
├── python-ai/                   # Python AI Server (Port 8000)
│   ├── api.py                   # FastAPI endpoints
│   ├── qabot.py                 # RAG + Hybrid Search (1272 lines)
│   ├── CreateVectorEmbeddings.py
│   ├── prepare_vector_db.py
│   ├── hotel_embeddings.npy     # Pre-computed embeddings
│   ├── vectorstores/
│   │   └── db_faiss/            # FAISS index
│   └── requirements.txt
│
└── docs/
    ├── README.md
    ├── API_DOCUMENTATION.md
    └── BEGINNER_GUIDE.md
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### Yêu Cầu Hệ Thống
- **Node.js** 18+ 
- **Python** 3.10+
- **npm** hoặc **bun**

### Bước 1: Clone Repository
```powershell
git clone https://github.com/CaoThien1402/Travel-System-.git
cd Travel-System-
```

### Bước 2: Cài đặt & Chạy Backend
```powershell
cd backend
npm install
npm run dev
```
✅ Backend chạy tại: `http://localhost:5000`

### Bước 3: Cài đặt & Chạy Frontend
```powershell
cd frontend
npm install
npm run dev
```
✅ Frontend chạy tại: `http://localhost:8080`

### Bước 4: Cài đặt & Chạy Python AI (Tùy chọn)
```powershell
cd python-ai
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```
✅ AI Server chạy tại: `http://localhost:8000`

> ⚠️ **Lưu ý:** Cần tạo file `.env` với `GOOGLE_API_KEY` để sử dụng AI

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/register` | Đăng ký tài khoản |
| POST | `/login` | Đăng nhập |
| POST | `/logout` | Đăng xuất |

### Properties (`/api/properties`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | Lấy danh sách (có filter, pagination) |
| GET | `/filters` | Lấy options cho bộ lọc |
| GET | `/:id` | Chi tiết 1 khách sạn |
| GET | `/search?query=...` | Tìm kiếm theo keyword |
| GET | `/district/:name` | Lọc theo quận |

### Semantic Search (`/api/semantic-search`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `?query=...&topK=10` | Tìm kiếm ngữ nghĩa (gọi Python) |

### Wishlist (`/api/wishlist`) - Yêu cầu Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | Lấy danh sách yêu thích |
| GET | `/check/:hotelId` | Kiểm tra đã yêu thích chưa |
| POST | `/` | Thêm vào yêu thích |
| DELETE | `/:id` | Xóa khỏi yêu thích |

### AI Chat (`/api/chat` hoặc Python `:8000/api/chat`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/chat` | Chat với AI, nhận gợi ý khách sạn |

---

## 🤖 Cách AI Hoạt Động (Hybrid RAG)

```
┌─────────────────────────────────────────────────────────────┐
│                     User Query (Tiếng Việt)                 │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Vector Search (50%)   │     │   Lexical Search (35%)  │
│   - HuggingFace Embed   │     │   - TF-IDF Vectorizer   │
│   - FAISS Similarity    │     │   - Cosine Similarity   │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
              ┌─────────────────────────────┐
              │   Hybrid Ranking (+ 15%)    │
              │   Quality Score: reviews,   │
              │   rating, star              │
              └─────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────┐
              │   Top-K Hotels (mặc định 10)│
              └─────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────┐
              │   Google Gemini LLM         │
              │   Tạo câu trả lời tự nhiên  │
              │   + Bảng so sánh khách sạn  │
              └─────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────┐
              │   Response + Hotel Cards    │
              └─────────────────────────────┘
```

**Trọng số Hybrid:**
- **50%** Vector Search (ngữ nghĩa)
- **35%** Lexical Search (từ khóa)
- **15%** Quality Score (đánh giá, sao)

---

## 📊 Dữ Liệu Khách Sạn

**Nguồn:** `backend/src/data/hotels.csv`

| Thông tin | Mô tả |
|-----------|-------|
| Số lượng | 103 khách sạn |
| Khu vực | 18 Quận/Huyện TP.HCM |
| Loại hình | Khách sạn, Resort, Villa, Homestay, Motel |
| Giá | 200,000 - 10,000,000+ VND/đêm |
| Đánh giá | 1-5 sao |

**Các trường dữ liệu:**
- `hotelname`, `address`, `district`, `city`
- `lat`, `lng` (tọa độ)
- `price` (khoảng giá: "490000 - 1150000")
- `star` (số sao hoặc text)
- `amenities` (tiện ích: WiFi, Pool, Gym...)
- `reviews`, `reviewsCount`, `totalScore`
- `imageUrl`, `website`, `phone`

---

## 🔐 Cấu Hình Môi Trường

### Frontend (`frontend/.env`)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### Backend (`backend/.env`)
```env
PORT=5000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### Python AI (`python-ai/.env`)
```env
GOOGLE_API_KEY=AIzaSy...
GEMINI_MODEL_NAME=gemini-2.5-flash-lite
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
```

---

## 📱 Screenshots Các Trang

| Trang | Mô tả |
|-------|-------|
| **Trang chủ** | Hero banner, thời tiết, khách sạn nổi bật |
| **Tìm kiếm** | Danh sách + bộ lọc + bản đồ (split view) |
| **Smart Search** | Chat AI toàn màn hình, lịch sử hội thoại |
| **Chi tiết** | Ảnh, thông tin, tiện ích, bản đồ POI |
| **Wishlist** | Grid cards khách sạn yêu thích |
| **Profile** | Form cập nhật thông tin cá nhân |

---

## 👥 Thành Viên Nhóm

**Nhóm 3T2M1** - Đồ án môn Computational Thinking

---

## 📄 License

MIT License - Tự do sử dụng cho mục đích học tập.
