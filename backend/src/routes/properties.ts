import express from 'express';
import { properties } from '../data/mockData';
import { authMiddleware } from '../middleware/auth';
import { Property, Review } from '../types';

const router = express.Router();

// Get all properties
router.get('/', (req, res) => {
  try {
    // Sort properties by created date
    const sortedProperties = [...properties].sort((a, b) => 
      new Date(b.created).getTime() - new Date(a.created).getTime()
    );
    res.json(sortedProperties);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single property
router.get('/:id', (req, res) => {
  try {
    const property = properties.find(p => p.id === req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    res.json(property);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create property (protected route)
router.post('/', authMiddleware, (req, res) => {
  try {
    const {
      title,
      description,
      price,
      location,
      amenities,
      images
    } = req.body;

    // Validate required fields
    if (!title || !description || !price || !location || !location.address || !location.city || !location.country) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newProperty: Property = {
      id: Date.now().toString(),
      title,
      description,
      price,
      location: {
        ...location,
        coordinates: location.coordinates || {
          latitude: 0,
          longitude: 0
        }
      },
      amenities: amenities || [],
      images: images || [],
      host: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      created: new Date().toISOString(),
      reviews: [],
      rating: 0
    };

    properties.push(newProperty);
    res.status(201).json(newProperty);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update property (protected route)
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const propertyIndex = properties.findIndex(p => p.id === req.params.id);
    
    if (propertyIndex === -1) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = properties[propertyIndex];

    // Check if user is the property host
    if (property.host !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updatedProperty = {
      ...property,
      ...req.body,
      id: property.id,  // Prevent id from being updated
      host: property.host  // Prevent host from being updated
    };

    properties[propertyIndex] = updatedProperty;
    res.json(updatedProperty);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add review to property (protected route)
router.post('/:id/reviews', authMiddleware, (req, res) => {
  try {
    const { rating, comment } = req.body;
    const propertyIndex = properties.findIndex(p => p.id === req.params.id);

    if (propertyIndex === -1) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const property = properties[propertyIndex];

    // Add review
      const newReview: Review = {
      user: {
        id: req.user.id,
        name: req.user.name
      },
      rating,
      comment,
      date: new Date().toISOString()
    };

    property.reviews.push(newReview);

    // Update property rating
    const totalRating = property.reviews.reduce((acc: number, review: Review) => {
      return acc + (review.rating || 0);
    }, 0);
    property.rating = Number((totalRating / property.reviews.length).toFixed(1));    properties[propertyIndex] = property;
    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;