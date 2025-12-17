import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client cho frontend operations (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client cho server operations (service role key - có full permissions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types (optional - để có type hints)
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: any;
  session?: any;
  error?: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  hotel_id: string;
  hotel_name?: string;
  hotel_image?: string;
  hotel_price?: number;
  hotel_district?: string;
  hotel_star?: number;
  created_at: string;
}