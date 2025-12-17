import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../supabase';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get all wishlist items for current user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabaseAdmin
      .from('wishlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wishlists:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ wishlists: data || [] });
  } catch (error) {
    console.error('Error in GET /api/wishlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if a hotel is in user's wishlist
router.get('/check/:hotelId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { hotelId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data, error } = await supabaseAdmin
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('hotel_id', hotelId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking wishlist:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ inWishlist: !!data });
  } catch (error) {
    console.error('Error in GET /api/wishlist/check:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add hotel to wishlist
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { hotel_id, hotel_name, hotel_image, hotel_price, hotel_district, hotel_star } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!hotel_id) {
      return res.status(400).json({ error: 'hotel_id is required' });
    }

    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('hotel_id', hotel_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Hotel already in wishlist' });
    }

    const { data, error } = await supabaseAdmin
      .from('wishlists')
      .insert({
        user_id: userId,
        hotel_id,
        hotel_name,
        hotel_image,
        hotel_price,
        hotel_district,
        hotel_star
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding to wishlist:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ wishlist: data });
  } catch (error) {
    console.error('Error in POST /api/wishlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove hotel from wishlist
router.delete('/:hotelId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { hotelId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { error } = await supabaseAdmin
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('hotel_id', hotelId);

    if (error) {
      console.error('Error removing from wishlist:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Removed from wishlist successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/wishlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
