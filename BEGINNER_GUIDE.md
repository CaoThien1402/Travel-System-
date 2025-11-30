# 🎓 Beginner's Guide to 3T2M1Stay Travel System

Welcome! This guide will help you understand and work with the 3T2M1Stay hotel booking system.

## 📋 Table of Contents
1. [What is This Project?](#what-is-this-project)
2. [Project Structure](#project-structure)
3. [Tech Stack Explained](#tech-stack-explained)
4. [Getting Started](#getting-started)
5. [Understanding the Code](#understanding-the-code)
6. [API Endpoints](#api-endpoints)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 What is This Project?

3T2M1Stay is a **hotel booking platform** for Ho Chi Minh City, Vietnam. It allows users to:
- Browse hotels and homestays
- Search by location, price, and rating
- Chat with an AI assistant to find suitable accommodations
- View hotel details and reviews

Think of it like Booking.com or Airbnb, but specifically for HCMC hotels.

---

## 📁 Project Structure

```
Travel-System/
├── backend/                    # Server-side code (API)
│   ├── src/
│   │   ├── index.ts           # Main server file - START HERE
│   │   ├── routes/            # API endpoints
│   │   │   ├── auth.ts        # Login/Register
│   │   │   ├── properties.ts  # Hotel listings
│   │   │   └── chat.ts        # AI chatbot
│   │   ├── utils/
│   │   │   └── csvReader.ts   # Reads hotel data from CSV
│   │   └── data/
│   │       └── hotels.csv     # Hotel database (103 hotels)
│   ├── package.json           # Dependencies list
│   └── tsconfig.json          # TypeScript configuration
│
├── frontend/                   # Client-side code (Website)
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Navbar.tsx     # Top navigation bar
│   │   │   ├── Hero.tsx       # Homepage banner
│   │   │   ├── SearchBar.tsx  # Search hotels
│   │   │   ├── Chatbot.tsx    # AI chat popup
│   │   │   └── ui/            # Basic UI elements (buttons, cards, etc.)
│   │   └── pages/             # Different pages
│   │       ├── Index.tsx      # Homepage
│   │       ├── Login.tsx      # Login page
│   │       └── HotelDetail.tsx # Hotel details page
│   └── package.json
│
└── python-ai/                  # Python AI tools (optional)
    ├── app.py                 # Streamlit chatbot app
    └── CreateVectorEmbeddings.py  # AI embeddings generator
```

---

## 🛠️ Tech Stack Explained

### Backend (Server)
- **Node.js**: JavaScript runtime (like Python but for JavaScript)
- **Express**: Web framework (handles HTTP requests)
- **TypeScript**: JavaScript with type checking (catches bugs before running)
- **csv-parser**: Reads CSV files (our "database")

### Frontend (Website)
- **React**: UI library (builds interactive web pages)
- **Vite**: Build tool (bundles code for production)
- **TypeScript**: Same as backend
- **Tailwind CSS**: Styling framework (makes things look pretty)
- **Shadcn UI**: Pre-built components (buttons, cards, dialogs)

### Python AI (Optional)
- **Streamlit**: Web app framework for Python
- **Transformers**: AI models for language processing
- **Google Gemini**: AI chatbot API

---

## 🚀 Getting Started

### Prerequisites
You need these installed on your computer:
- **Node.js** (v18+) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PowerShell** or any terminal
- **VS Code** (recommended editor)

### Installation Steps

1. **Open PowerShell** in the project folder
   ```powershell
   cd "c:\Users\ADMIN\OneDrive\Python\Computational_Thinking\Project_CT\Travel-System-"
   ```

2. **Install Backend Dependencies**
   ```powershell
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```powershell
   cd ../frontend
   npm install
   ```

4. **Start the Backend Server**
   ```powershell
   cd ../backend
   npm run dev
   ```
   ✅ Server runs on: **http://localhost:5000**

5. **Start the Frontend** (in a NEW PowerShell window)
   ```powershell
   cd frontend
   npm run dev
   ```
   ✅ Website runs on: **http://localhost:8080**

6. **Open in Browser**
   Visit: http://localhost:8080

---

## 📚 Understanding the Code

### How the Backend Works

**Flow: Client → Express → Route → CSV → Response**

```
User Browser → HTTP Request → Express Server → Route Handler → Load CSV → Return JSON
```

**Example: Getting All Hotels**
```typescript
// 1. User visits: http://localhost:5000/api/properties
// 2. Express receives GET request
// 3. properties.ts handles the request
router.get('/', async (req, res) => {
  const hotels = await loadHotelsFromCSV();  // 4. Load from CSV
  res.json(hotels);                          // 5. Return JSON
});
```

### How the Frontend Works

**Flow: User Interaction → React Component → API Call → Update UI**

```
User clicks → React Component → fetch() to Backend → Update State → Re-render
```

**Example: Showing Hotel List**
```typescript
// PropertyListing.tsx
const [hotels, setHotels] = useState([]);

// Load hotels when page loads
useEffect(() => {
  fetch('http://localhost:5000/api/properties')
    .then(response => response.json())
    .then(data => setHotels(data));  // Update state
}, []);

// Display hotels
return (
  <div>
    {hotels.map(hotel => (
      <HotelCard key={hotel.id} hotel={hotel} />
    ))}
  </div>
);
```

### Key Concepts

**1. Async/Await**
```typescript
// Reading files takes time, so we use async/await
async function loadData() {
  const data = await readFile();  // Wait for file to load
  console.log(data);               // Then use it
}
```

**2. API Routes**
```typescript
// GET = Retrieve data
router.get('/hotels', getHotels);

// POST = Create new data
router.post('/reviews', addReview);

// PUT = Update data
router.put('/hotels/:id', updateHotel);

// DELETE = Remove data
router.delete('/hotels/:id', deleteHotel);
```

**3. Filtering Arrays**
```typescript
// Filter hotels by price
const cheapHotels = hotels.filter(h => h.price < 1000000);

// Filter by district
const district1Hotels = hotels.filter(h => h.district.includes('Quận 1'));
```

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)

#### Register New User
```
POST /api/auth/register
Body: { "email": "user@example.com", "password": "pass123", "name": "John" }
Response: { "message": "Registration successful", "user": {...} }
```

#### Login
```
POST /api/auth/login
Body: { "email": "user@example.com", "password": "pass123" }
Response: { "message": "Login successful", "user": {...} }
```

#### Logout
```
POST /api/auth/logout
Response: { "message": "Logout successful" }
```

### Properties (`/api/properties`)

#### Get All Hotels
```
GET /api/properties
Query Params: ?district=Quận 1&minPrice=500000&maxPrice=2000000&minStar=3
Response: [ { id: 1, hotelname: "...", price: 800000, ... }, ... ]
```

#### Search Hotels
```
GET /api/properties/search?query=sunrise
Response: [ { id: 5, hotelname: "Sunrise Hotel", ... }, ... ]
```

#### Get Hotel by ID
```
GET /api/properties/42
Response: { id: 42, hotelname: "Grand Hotel", ... }
```

#### Get Hotels by District
```
GET /api/properties/district/Quận 1
Response: [ { id: 1, district: "Quận 1", ... }, ... ]
```

#### Add Review
```
POST /api/properties/42/reviews
Body: { "rating": 4.5, "comment": "Great hotel!" }
Response: { "message": "Review added successfully", "review": {...} }
```

### Chat (`/api/chat`)

#### Chat with AI
```
POST /api/chat
Body: { "message": "Tìm khách sạn giá rẻ ở Quận 1" }
Response: { "response": "Tôi tìm thấy 5 khách sạn...", "timestamp": "..." }
```

---

## 🔧 Common Tasks

### Task 1: Add a New Hotel Field

**Backend (csvReader.ts)**
```typescript
export interface Hotel {
  id: number;
  hotelname: string;
  // ... existing fields
  hasPool: boolean;  // NEW FIELD
}

// In parseRow function:
const hotel: Hotel = {
  // ... existing parsing
  hasPool: row.hasPool === 'true',  // Parse from CSV
};
```

**Frontend (PropertyCard.tsx)**
```typescript
{hotel.hasPool && (
  <Badge>🏊 Has Pool</Badge>
)}
```

### Task 2: Add a New Filter

**Backend (properties.ts)**
```typescript
router.get('/', async (req, res) => {
  let hotels = await loadHotelsFromCSV();
  
  const { hasWifi } = req.query;  // NEW FILTER
  
  if (hasWifi === 'true') {
    hotels = hotels.filter(h => h.amenities?.includes('WiFi'));
  }
  
  res.json(hotels);
});
```

**Frontend (SearchBar.tsx)**
```typescript
const [hasWifi, setHasWifi] = useState(false);

const handleSearch = () => {
  const params = new URLSearchParams();
  if (hasWifi) params.append('hasWifi', 'true');
  
  fetch(`/api/properties?${params}`);
};
```

### Task 3: Improve the Chatbot

**Backend (chat.ts)**
```typescript
// Add more sophisticated AI logic
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const generateResponse = async (message: string) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: message }],
  });
  
  return completion.choices[0].message.content;
};
```

---

## 🐛 Troubleshooting

### Problem: "Cannot find module 'csv-parser'"
**Solution:**
```powershell
cd backend
npm install csv-parser
```

### Problem: "Port 5000 already in use"
**Solution:**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual number)
taskkill /PID 12345 /F
```

### Problem: "Hotels not loading (0 hotels)"
**Solution:**
1. Check if `hotels.csv` exists in `backend/src/data/`
2. Run build: `npm run build`
3. Check if `hotels.csv` is copied to `backend/dist/data/`
4. Run the copy script: `.\copy-data.ps1`

### Problem: "TypeScript errors"
**Solution:**
```powershell
cd backend
npm run build  # This will show all errors
```

### Problem: "CORS error in browser"
**Solution:**
Make sure backend has CORS enabled:
```typescript
// backend/src/index.ts
import cors from 'cors';
app.use(cors());
```

### Problem: "Frontend shows blank page"
**Solution:**
1. Check browser console (F12)
2. Verify backend is running on port 5000
3. Check API URL in frontend code

---

## 📖 Learning Resources

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript for Beginners](https://www.youtube.com/watch?v=BwuLxPH8IDs)

### React
- [React Official Tutorial](https://react.dev/learn)
- [React for Beginners](https://www.youtube.com/watch?v=SqcY0GlETPk)

### Node.js & Express
- [Node.js Crash Course](https://www.youtube.com/watch?v=fBNz5xF-Kx4)
- [Express.js Tutorial](https://expressjs.com/en/starter/installing.html)

### REST APIs
- [What is REST API?](https://www.youtube.com/watch?v=lsMQRaeKNDk)
- [HTTP Methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)

---

## 💡 Next Steps

Once you're comfortable with the basics, try these challenges:

1. **Add Booking Feature**: Create a booking system where users can reserve rooms
2. **Real Database**: Replace CSV with MongoDB or PostgreSQL
3. **Image Upload**: Allow hotel owners to upload photos
4. **Payment Integration**: Add Stripe or PayPal payment
5. **Email Notifications**: Send confirmation emails using SendGrid
6. **Advanced Search**: Add map-based search using Google Maps API
7. **User Reviews**: Let users rate and review hotels
8. **Admin Dashboard**: Create a panel for managing hotels

---

## ❓ Need Help?

- Check the comments in the code - every file is documented for beginners
- Read this guide again - sometimes things make more sense the second time
- Use console.log() to debug - print variables to understand what's happening
- Google the error message - most errors have been solved by someone else
- Ask ChatGPT or GitHub Copilot - explain the code you don't understand

---

**Happy Coding! 🚀**

Made with ❤️ for beginners learning full-stack development
