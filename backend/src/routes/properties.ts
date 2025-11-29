import { Router } from 'express';
import { hotels } from '../data/mockData';

const router = Router();

// Search hotels
router.get('/search', (req, res) => {
  const query = req.query.query as string;

  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required.' });
  }

  const results = hotels.filter((hotel) =>
    hotel.name.toLowerCase().includes(query.toLowerCase()) ||
    hotel.location.toLowerCase().includes(query.toLowerCase())
  );

  return res.status(200).json(results);
});

// Get hotel by ID
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  const hotel = hotels.find((h) => h.id === id);

  if (!hotel) {
    return res.status(404).json({ message: 'Hotel not found.' });
  }

  return res.status(200).json(hotel);
});

export default router;