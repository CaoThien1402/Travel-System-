# 🏨 3T2M1Stay - Hotel Booking System

A full-stack hotel booking platform for Ho Chi Minh City, Vietnam, featuring an AI-powered chatbot assistant.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-404D59?logo=express)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)

## ✨ Features

- 🔍 **Smart Search** - Filter hotels by location, price, and rating
- 💬 **AI Chatbot** - Get personalized recommendations in Vietnamese
- 🗺️ **Location-Based** - Browse hotels by district in HCMC
- ⭐ **Reviews & Ratings** - View hotel ratings and reviews
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Modern UI** - Built with Tailwind CSS and Shadcn UI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- PowerShell or any terminal

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Travel-System-
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the backend server**
   ```bash
   cd ../backend
   npm run dev
   ```
   Server runs on: http://localhost:5000

5. **Start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   Website runs on: http://localhost:8080

6. **Open in browser**
   Visit: http://localhost:8080

## 📁 Project Structure

```
Travel-System/
├── backend/                 # Node.js + Express backend
│   ├── src/
│   │   ├── index.ts        # Main server file
│   │   ├── routes/         # API endpoints
│   │   │   ├── auth.ts     # Authentication
│   │   │   ├── properties.ts # Hotel CRUD
│   │   │   └── chat.ts     # AI chatbot
│   │   ├── utils/
│   │   │   └── csvReader.ts # CSV data loader
│   │   └── data/
│   │       └── hotels.csv  # Hotel database (103 hotels)
│   └── package.json
│
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx         # Main app
│   │   ├── components/     # Reusable components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Hero.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── Chatbot.tsx
│   │   │   └── ui/         # Shadcn UI components
│   │   └── pages/          # Page components
│   └── package.json
│
├── python-ai/              # Optional Python AI tools
│   └── app.py              # Streamlit chatbot
│
├── BEGINNER_GUIDE.md       # Complete beginner's guide
└── API_DOCUMENTATION.md    # API reference
```

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type-safe JavaScript
- **csv-parser** - CSV file parsing

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library

### Python AI (Optional)
- **Streamlit** - Web app framework
- **Transformers** - NLP models
- **Google Gemini** - AI API

## 📖 Documentation

- **[Beginner's Guide](BEGINNER_GUIDE.md)** - Complete guide for new developers
- **[API Documentation](API_DOCUMENTATION.md)** - Full API reference
- **Inline Comments** - Every file is documented with beginner-friendly comments

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Properties
- `GET /api/properties` - Get all hotels (with filters)
- `GET /api/properties/search` - Search hotels
- `GET /api/properties/:id` - Get hotel by ID
- `GET /api/properties/district/:district` - Get hotels by district
- `POST /api/properties/:id/reviews` - Add review

### Chat
- `POST /api/chat` - Chat with AI assistant

## 💡 Example Usage

### Search Hotels by District and Price
```typescript
GET /api/properties?district=Quận 1&minPrice=500000&maxPrice=2000000&minStar=3
```

### Chat with AI
```typescript
POST /api/chat
Body: { 
  "message": "Tìm khách sạn giá rẻ ở Quận 1" 
}
```

## 🎯 Key Features Explained

### 1. Smart Filtering
Filter hotels by:
- District (Quận 1, Quận 3, Thủ Đức, etc.)
- Price range (VND)
- Star rating (1-5)
- Search keywords

### 2. AI Chatbot
- Understands Vietnamese queries
- Keyword-based recommendations
- Returns top 5 matching hotels
- Filters by location and price

### 3. Hotel Details
Each hotel includes:
- Name, address, district
- Price per night
- Star rating
- Amenities (WiFi, Pool, Gym, etc.)
- Reviews and ratings
- Google Maps link

## 🔧 Development Scripts

### Backend
```bash
npm run dev      # Start dev server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm run start    # Run compiled code
```

### Frontend
```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F
```

### CSV File Not Found
```bash
cd backend
npm run build
# Copy CSV to dist folder
.\copy-data.ps1
```

### TypeScript Errors
```bash
cd backend
npm run build  # Shows all errors
```

### CORS Issues
Make sure CORS is enabled in `backend/src/index.ts`:
```typescript
import cors from 'cors';
app.use(cors());
```

## 📊 Database

Currently using **CSV files** as a simple database:
- **Location:** `backend/src/data/hotels.csv`
- **Hotels:** 103 properties in HCMC
- **Fields:** 35+ data points per hotel

### Migrating to Real Database

To use MongoDB:
```bash
npm install mongoose
```

To use PostgreSQL:
```bash
npm install pg typeorm
```

See [Beginner's Guide](BEGINNER_GUIDE.md) for migration tutorials.

## 🎨 Customization

### Change Branding
All "3T2M1Stay" text can be found in:
- `frontend/src/components/Navbar.tsx`
- `frontend/src/components/Footer.tsx`
- `backend/src/routes/chat.ts`

### Add New Features
1. Read the [Beginner's Guide](BEGINNER_GUIDE.md)
2. Check the inline comments in code
3. Follow existing patterns in route files

### Modify Chatbot Responses
Edit: `backend/src/routes/chat.ts` → `generateResponse()` function

## 🚀 Deployment

### Backend (Railway/Render)
```bash
cd backend
npm run build
# Upload dist/ folder
```

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Upload dist/ folder
```

### Environment Variables
Create `.env` file:
```
PORT=5000
NODE_ENV=production
OPENAI_API_KEY=your_key_here  # Optional for better AI
```

## 🤝 Contributing

This project is designed for learning. Feel free to:
- Fork and experiment
- Add new features
- Improve documentation
- Fix bugs
- Share with other learners

## 📝 License

This project is for educational purposes. Feel free to use and modify.

## 👥 Authors

- **Original Project:** Travel System
- **Rebranded to:** 3T2M1Stay
- **Documentation:** Added beginner-friendly comments and guides

## 📧 Contact

- **Email:** support@3t2m1stay.vn
- **Issues:** Please open an issue on GitHub
- **Questions:** Check [Beginner's Guide](BEGINNER_GUIDE.md) first

## 🎓 Learning Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [Node.js Docs](https://nodejs.org/docs/)

## 🔮 Roadmap

Future enhancements:
- [ ] Real database (MongoDB/PostgreSQL)
- [ ] JWT authentication
- [ ] Payment integration (Stripe/PayPal)
- [ ] Email notifications
- [ ] Advanced AI with OpenAI/Gemini
- [ ] Image upload for hotels
- [ ] Booking system
- [ ] Admin dashboard
- [ ] Mobile app (React Native)

---

**Made with ❤️ for learning full-stack development**

**Happy Coding! 🚀**
