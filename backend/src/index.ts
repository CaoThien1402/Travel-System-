import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import router chat
import chatRoutes from './routes/chat';

// Import properties routes
import propertiesRoutes from './routes/properties';

// Tạm thời comment auth routes chưa dùng
// import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // Cho phép Frontend gọi API
app.use(express.json());

// --- Routes ---
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to 3T2M1Stay API!' });
});

// ĐĂNG KÝ ROUTE CHAT
// Đường dẫn sẽ là: /api + /chat = /api/chat
app.use('/api', chatRoutes); 

// Các routes khác (mở lại khi bạn fix xong các file đó)
// app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);

// --- Error Handling ---
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Backend Server đang chạy tại: http://localhost:${PORT}`);
});