import { Router, Request, Response } from 'express';
import { loadHotelsFromCSV } from '../utils/csvReader';

const router = Router();

/**
 * GET /api/properties/filters
 * Trả về các giá trị unique cho filter dropdowns
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

export default router;
