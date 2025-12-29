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
// GET FILTER OPTIONS
// ========================================
/**
 * GET /api/properties/filters
 * Returns unique values for filter dropdowns
 */
router.get('/filters', async (_req: Request, res: Response) => {
  try {
    const hotels = await loadHotelsFromCSV();

    // Lấy unique searchString (loại nơi ở)
    const searchStrings = [...new Set(
      hotels
        .map(h => h.searchString)
        .filter(s => s && s.trim() !== '')
    )].sort();

    // Lấy unique districts
    const districts = [...new Set(
      hotels
        .map(h => h.district)
        .filter(d => d && d.trim() !== '')
    )].sort();

    // Tính price ranges
    const prices = hotels
      .map(h => h.price)
      .filter(p => typeof p === 'number' && !isNaN(p) && p > 0);

    const minPrice = Math.floor(Math.min(...prices));
    const maxPrice = Math.ceil(Math.max(...prices));

    // Tạo price range buckets
    const priceRanges = [
      { label: 'Dưới 500K', min: 0, max: 500000 },
      { label: '500K - 1M', min: 500000, max: 1000000 },
      { label: '1M - 2M', min: 1000000, max: 2000000 },
      { label: '2M - 5M', min: 2000000, max: 5000000 },
      { label: 'Trên 5M', min: 5000000, max: maxPrice }
    ];

    // Lấy unique star ratings
    const starRatings = [...new Set(
      hotels
        .map(h => {
          // Parse star from text like "Khách sạn 3 sao"
          if (typeof h.star === 'number') return h.star;
          const match = String(h.star || '').match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(s => s > 0 && s <= 5)
    )].sort((a, b) => b - a);

    res.json({
      success: true,
      filters: {
        searchStrings,
        districts,
        priceRanges,
        starRatings,
        priceMin: minPrice,
        priceMax: maxPrice,
        totalHotels: hotels.length
      }
    });

  } catch (error) {
    console.error('Error loading filters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load filters'
    });
  }
});

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
    const { district, minPrice, maxPrice, minStar, search, limit, page, pageSize, noPagination } = req.query;
    
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
    
    // If noPagination=true, return all results (for FeaturedProperties)
    if (noPagination === 'true') {
      return res.status(200).json(filteredHotels);
    }
    
    // Apply limit if specified (legacy support)
    if (limit && !isNaN(Number(limit)) && !page) {
      return res.status(200).json(filteredHotels.slice(0, Number(limit)));
    }
    
    // Apply pagination (default: page 1, 20 items per page)
    const totalCount = filteredHotels.length;
    const currentPage = page ? Math.max(1, parseInt(page as string)) : 1;
    const itemsPerPage = pageSize ? Math.min(50, parseInt(pageSize as string)) : 20;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    const results = filteredHotels.slice(startIndex, endIndex);
    
    // Return paginated results with metadata
    return res.status(200).json({
      hotels: results,
      pagination: {
        page: currentPage,
        pageSize: itemsPerPage,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1
      }
    });
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