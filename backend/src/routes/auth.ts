import { Router } from 'express';

const router = Router();

// Simulated user database
const users = [
  { id: 1, name: 'Test User', email: 'test@example.com', password: 'password123' },
];

// Register route
router.post('/register', (req, res) => {
  console.log('Request body:', req.body);
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  const existingUser = users.find((user) => user.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists.' });
  }

  const newUser = { id: Date.now(), name, email, password };
  users.push(newUser);

  return res.status(201).json({ message: 'User registered successfully.', user: newUser });
});

// Login route
router.post('/login', (req, res) => {
  console.log('Login request body:', req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  return res.status(200).json({ message: 'Login successful.', token: 'fake-jwt-token', user });
});

export default router;