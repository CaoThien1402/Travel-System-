/**
 * Main Server File - Entry point for 3T2M1Stay Backend API
 * 
 * This file sets up the Express server and configures all routes and middleware.
 * Perfect for beginners to understand how a Node.js/Express backend works!
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';

// Import our route handlers
import authRoutes from './routes/auth';
import propertiesRoutes from './routes/properties';
import chatRoutes from './routes/chat';

// Load environment variables from .env file
dotenv.config();

// Create Express app instance
const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARE SETUP
// ========================================
// Middleware runs before your routes and processes requests

app.use(cors()); // Enable CORS - allows frontend to talk to backend
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data

// ========================================
// ROUTES SETUP
// ========================================
// Define what happens when users visit different URLs

// Home route - shows API information
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Welcome to 3T2M1Stay API!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth - User authentication',
      properties: '/api/properties - Hotel listings',
      chat: '/api/chat - AI Chatbot'
    }
  });
});

// Register all API routes
app.use('/api/auth', authRoutes);           // User login/register
app.use('/api/properties', propertiesRoutes); // Hotel operations
app.use('/api', chatRoutes);                  // AI Chatbot

// ========================================
// ERROR HANDLING
// ========================================

// Handle 404 - Route not found
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    message: 'Route not found',
    availableRoutes: ['/api/auth', '/api/properties', '/api/chat']
  });
});

// Handle all other errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`🚀 Server running: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Ready to accept requests!`);
});