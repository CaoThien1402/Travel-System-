import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import propertiesRoutes from './routes/properties';
import chatRoutes from './routes/chat';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ==========================================
// ROUTES
// ==========================================
app.get('/', (req, res) => {
  res.json({
    message: '🏨 3T2M1Stay API Server',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth/*',
      properties: '/api/properties/*',
      chat: '/api/chat'
    }
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Properties routes
app.use('/api/properties', propertiesRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);

// ==========================================
// ERROR HANDLING
// ==========================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});