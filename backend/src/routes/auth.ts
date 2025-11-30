/**
 * Authentication Routes - Handles user login and registration
 * 
 * Routes in this file:
 * - POST /api/auth/register - Create new user account
 * - POST /api/auth/login - Login existing user
 * - POST /api/auth/logout - Logout user
 * 
 * For beginners: This is a simple in-memory auth system.
 * In production, use a database and proper password hashing!
 */

import { Router, Request, Response } from 'express';

const router = Router();

// User data structure
interface User {
  id: number;
  name: string;
  email: string;
  password: string; // In production: NEVER store plain passwords!
}

// Temporary in-memory user storage (resets when server restarts)
// TODO: Replace with database (MongoDB, PostgreSQL, etc.)
const users: User[] = [
  { 
    id: 1, 
    name: 'Test User', 
    email: 'test@example.com', 
    password: 'password123' // Demo only!
  },
];

// ========================================
// REGISTER NEW USER
// ========================================
// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  try {
    console.log('Registration attempt:', req.body);
    
    // Get user data from request
    const { name, email, password } = req.body;

    // Validation: Check all required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Name, email, and password are required.' 
      });
    }

    // Validation: Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    // Check if user already exists
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    // Create new user
    const newUser: User = { 
      id: Date.now(), // Simple ID generation
      name, 
      email, 
      password // WARNING: In production, hash this password!
    };
    users.push(newUser);

    // Don't send password back to client (security best practice)
    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({ 
      message: 'User registered successfully.', 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
});

// ========================================
// LOGIN USER
// ========================================
// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    console.log('Login attempt:', req.body);
    
    // Get credentials from request
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required.' 
      });
    }

    // Find user with matching email and password
    const user = users.find((u) => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Don't send password back to client
    const { password: _, ...userWithoutPassword } = user;

    // In production: Generate a real JWT token here
    const token = `fake-jwt-token-${user.id}`;

    return res.status(200).json({ 
      message: 'Login successful.', 
      token, 
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
});

// Logout route (for future use)
router.post('/logout', (req: Request, res: Response) => {
  return res.status(200).json({ message: 'Logout successful.' });
});

export default router;