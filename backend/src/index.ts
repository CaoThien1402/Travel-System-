import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routers
import authRoutes from './routes/auth';
import propertiesRoutes from './routes/properties';
import chatRoutes from './routes/chat';
import semanticSearchRoutes from './routes/semanticSearch';
import wishlistRoutes from './routes/wishlist';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Cho phép Frontend gọi API
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// --- Routes ---
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to 3T2M1Stay API!' });
});

// Auth routes (từ branch authentication)
app.use('/api/auth', authRoutes);

// Properties routes
app.use('/api/properties', propertiesRoutes);

// ĐĂNG KÝ ROUTE CHAT (Chatbot - gọi Python AI server)
// Đường dẫn sẽ là: /api + /chat = /api/chat
app.use('/api', chatRoutes); 

// ĐĂNG KÝ ROUTE SEMANTIC SEARCH (Search Bar - gọi Python script trực tiếp)
// Đường dẫn: /api/semantic-search
app.use('/api', semanticSearchRoutes);

// ĐĂNG KÝ ROUTE WISHLIST (Danh sách yêu thích)
// Đường dẫn: /api/wishlist
app.use('/api/wishlist', wishlistRoutes);

// --- Error Handling ---
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Backend Server đang chạy tại: http://localhost:${PORT}`);
});