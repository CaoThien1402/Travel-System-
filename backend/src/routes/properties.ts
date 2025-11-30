/**
 * Property Routes - Handles all hotel/homestay operations
 * 
 * This file contains endpoints for:
 * - Listing all properties with filtering
 * - Getting details of a specific property
 * - Adding reviews to properties
 * 
 * For beginners: These are RESTful API endpoints that follow standard patterns:
 * - GET: Retrieve data
 * - POST: Create/add new data
 * - PUT: Update existing data
 * - DELETE: Remove data
 */

import { Router, Request, Response } from 'express';
import { loadHotelsFromCSV } from '../utils/csvReader';

const router = Router();

// ========================================
// GET ALL PROPERTIES WITH FILTERING
// ========================================
/**
 * GET /api/properties
 * Returns list of all hotels with optional filtering
 * 
 * Query parameters (all optional):
 * - district: Filter by district name (e.g., "Quận 1")
 * - minPrice: Minimum price in VND
 * - maxPrice: Maximum price in VND
 * - minStar: Minimum star rating (1-5)
 * - search: Search in hotel name/address/district
 * 
 * Example: /api/properties?district=Quận 1&minPrice=500000&maxPrice=2000000&minStar=3
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Load all hotels from CSV file
    const hotels = await loadHotelsFromCSV();
    
    // Extract query parameters from URL
    const { district, minPrice, maxPrice, minStar, search } = req.query;
    
    let filteredHotels = hotels;
    
    // Filter by district if provided (exclude "Tất cả" which means "All")
    if (district && district !== 'Tất cả') {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.district.includes(district as string)
      );
    }
    
    // Filter by minimum price if provided
    if (minPrice) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.price >= parseFloat(minPrice as string)
      );
    }
    
    // Filter by maximum price if provided
    if (maxPrice) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.price <= parseFloat(maxPrice as string)
      );
    }
    
    // Filter by minimum star rating if provided
    if (minStar) {
      filteredHotels = filteredHotels.filter(hotel => 
        hotel.star >= parseFloat(minStar as string)
      );
    }
    
    // Search across name, address, and district if provided
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredHotels = filteredHotels.filter(hotel =>
        hotel.hotelname.toLowerCase().includes(searchLower) ||
        hotel.address.toLowerCase().includes(searchLower) ||
        hotel.district.toLowerCase().includes(searchLower)
      );
    }
    
    // Return filtered results
    return res.status(200).json(filteredHotels);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    return res.status(500).json({ message: 'Failed to fetch hotels' });
  }
});

// ========================================
// SEARCH HOTELS
// ========================================
/**
 * GET /api/properties/search
 * Advanced search across multiple hotel fields
 * 
 * Query parameter:
 * - query: Search term to look for
 * 
 * Searches in: hotel name, address, district, searchString
 * 
 * Example: /api/properties/search?query=sunrise
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;

    // Validation: Check if query is provided
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required.' });
    }

    // Load all hotels
    const hotels = await loadHotelsFromCSV();
    const queryLower = query.toLowerCase();
    
    // Search across multiple fields
    const results = hotels.filter((hotel) =>
      hotel.hotelname.toLowerCase().includes(queryLower) ||
      hotel.address.toLowerCase().includes(queryLower) ||
      hotel.district.toLowerCase().includes(queryLower) ||
      hotel.searchString.toLowerCase().includes(queryLower)
    );

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error searching hotels:', error);
    return res.status(500).json({ message: 'Failed to search hotels' });
  }
});

// ========================================
// GET HOTEL BY ID
// ========================================
/**
 * GET /api/properties/:id
 * Returns details of a specific hotel
 * 
 * URL parameter:
 * - id: The hotel ID number
 * 
 * Example: /api/properties/42
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Parse ID from URL parameter
    const id = parseInt(req.params.id, 10);

    // Validation: Check if ID is a valid number
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid hotel ID' });
    }

    // Load hotels and find matching one
    const hotels = await loadHotelsFromCSV();
    const hotel = hotels.find((h) => h.id === id);

    // If not found, return 404 error
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found.' });
    }

    // Return hotel details
    return res.status(200).json(hotel);
  } catch (error) {
    console.error('Error fetching hotel:', error);
    return res.status(500).json({ message: 'Failed to fetch hotel details' });
  }
});

// ========================================
// ADD REVIEW TO HOTEL
// ========================================
/**
 * POST /api/properties/:id/reviews
 * Adds a new review to a hotel
 * 
 * URL parameter:
 * - id: The hotel ID number
 * 
 * Request body:
 * {
 *   "rating": 4.5,
 *   "comment": "Great hotel!"
 * }
 * 
 * Note for beginners: This is a mock implementation - it returns success but
 * doesn't actually save the review (we're using CSV, not a real database).
 * In a production app, you'd save to MongoDB, PostgreSQL, etc.
 */
router.post('/:id/reviews', async (req: Request, res: Response) => {
  try {
    // Parse ID from URL
    const id = parseInt(req.params.id, 10);
    const { rating, comment } = req.body;

    // Validation: Check if ID is valid
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid hotel ID' });
    }

    // Validation: Check required fields
    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    // Verify hotel exists
    const hotels = await loadHotelsFromCSV();
    const hotel = hotels.find((h) => h.id === id);

    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found.' });
    }

    // Mock response - in real app, save to database here
    // In a real application, you would save this to a database
    // For now, just return success
    return res.status(201).json({ 
      message: 'Review added successfully',
      review: {
        hotelId: id,
        rating,
        comment,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error adding review:', error);
    return res.status(500).json({ message: 'Failed to add review' });
  }
});

// ========================================
// GET HOTELS BY DISTRICT
// ========================================
/**
 * GET /api/properties/district/:district
 * Returns all hotels in a specific district
 * 
 * URL parameter:
 * - district: The district name (e.g., "Quận 1", "Thủ Đức")
 * 
 * Example: /api/properties/district/Quận 1
 */
router.get('/district/:district', async (req: Request, res: Response) => {
  try {
    const { district } = req.params;
    
    // Load all hotels
    const hotels = await loadHotelsFromCSV();
    
    // Filter by district (case-insensitive)
    const results = hotels.filter(hotel => 
      hotel.district.toLowerCase().includes(district.toLowerCase())
    );

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching hotels by district:', error);
    return res.status(500).json({ message: 'Failed to fetch hotels by district' });
  }
});

export default router;