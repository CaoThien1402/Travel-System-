/**
 * CSV Reader Utility - Loads hotel data from CSV file
 * 
 * This utility handles:
 * - Reading and parsing the hotels.csv file
 * - Converting CSV rows into JavaScript objects
 * - Caching data in memory for performance
 * - Parsing complex data like arrays stored as strings
 * 
 * For beginners: This is a helper module that:
 * 1. Reads the CSV file only once (on first request)
 * 2. Stores the data in memory (cache)
 * 3. Returns cached data on subsequent requests (much faster!)
 */

import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';

// ========================================
// DATA TYPES
// ========================================
/**
 * Hotel interface - defines the complete structure of hotel data
 * 
 * For beginners: This is like a blueprint that says "every hotel must have these fields".
 * The ? symbol means "optional" - the field may or may not exist.
 */
export interface Hotel {
  id: number;                    // Unique identifier
  hotelname: string;             // Hotel name
  address: string;               // Full address
  street: string;                // Street name
  district: string;              // District (Quận)
  city: string;                  // City (usually "Hồ Chí Minh")
  lat: number;                   // Latitude coordinate
  lon: number;                   // Longitude coordinate
  searchString: string;          // Combined string for searching
  categoryName: string;          // Category (Hotel, Homestay, etc.)
  categories: string[];          // Array of categories
  description1?: string;         // First description
  description2?: string;         // Second description
  url_google?: string;           // Google Maps URL
  website?: string;              // Hotel website
  phone?: string;                // Phone number
  price: number;                 // Price per night in VND
  imageUrl?: string;             // Main image URL
  star: number;                  // Star rating (1-5)
  rank?: number;                 // Ranking number
  totalScore?: number;           // Total review score
  oneStar?: number;              // Number of 1-star reviews
  twoStar?: number;              // Number of 2-star reviews
  threeStar?: number;            // Number of 3-star reviews
  fourStar?: number;             // Number of 4-star reviews
  fiveStar?: number;             // Number of 5-star reviews
  reviewsCount?: number;         // Total number of reviews
  amenities?: string[];          // Array of amenities (WiFi, Pool, etc.)
  reviews?: string[];            // Array of review texts
  alln?: string;                 // Additional field
}

// ========================================
// CACHING MECHANISM
// ========================================
/**
 * In-memory cache for hotel data
 * 
 * For beginners: Think of this as a storage box:
 * - If null = empty box, need to load from CSV files
 * - If has data = box is full, just return it (no file reading needed)
 * 
 * Why cache? Reading files from disk is SLOW. By caching, we read once
 * and serve from memory (1000x faster!)
 */
let hotelsCache: Hotel[] | null = null;

// Đã xóa hàm loadDistrict1Hotels vì chỉ còn sử dụng 1 file hotels.csv

// ========================================
// HELPER FUNCTION: PARSE ARRAY STRINGS
// ========================================
/**
 * Converts string representation of arrays to actual arrays
 * 
 * Example: "['WiFi', 'Pool', 'Gym']" → ['WiFi', 'Pool', 'Gym']
 * 
 * For beginners: CSV files can only store text. If we want to store arrays,
 * we save them as text like "['item1', 'item2']", then convert back to arrays.
 */
export const parseArrayString = (value: string): string[] => {
  // Handle empty or invalid values
  if (!value || value === '[]' || value === 'nan' || value === 'None') {
    return [];
  }
  
  try {
    // Remove outer brackets: "['a', 'b']" → "'a', 'b'"
    const cleaned = value.replace(/^\[|\]$/g, '').trim();
    if (!cleaned) return [];
    
    // Split by comma and clean each item
    return cleaned
      .split(',')
      .map(item => item.trim().replace(/^['"]|['"]$/g, '')) // Remove quotes
      .filter(item => item && item !== 'None' && item !== 'null'); // Remove empty/invalid
  } catch {
    return [];
  }
};

// ========================================
// HELPER FUNCTION: PARSE STAR RATING
// ========================================
/**
 * Extracts star rating from text like "Khách sạn 2 sao" → 2
 * If no number found, returns 0
 */
const parseStarRating = (value: string): number => {
  if (!value) return 0;
  
  // Try to parse as number first
  const num = parseFloat(value);
  if (!isNaN(num)) return num;
  
  // Extract number from text like "Khách sạn 2 sao"
  const match = value.match(/(\d+)\s*sao/i);
  if (match) return parseInt(match[1], 10);
  
  return 0;
};

// ========================================
// HELPER FUNCTION: PARSE PRICE
// ========================================
/**
 * Parses price value, handles empty and invalid values
 * Supports price ranges like "490000 - 1150000" (returns min price)
 */
const parsePrice = (value: string): number => {
  if (!value || value === '' || value === 'None' || value === 'nan') return 0;
  
  // Check if it's a price range (e.g., "490000 - 1150000")
  if (value.includes('-')) {
    const parts = value.split('-').map(p => p.trim());
    const minPrice = parseFloat(parts[0]);
    return isNaN(minPrice) ? 0 : minPrice;
  }
  
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

// ========================================
// MAIN FUNCTION: LOAD HOTELS FROM CSV
// ========================================
/**
 * Loads all hotel data from CSV files (hotels.csv + district1.csv)
 * 
 * Process:
 * 1. Check if data is already cached → return immediately if yes
 * 2. Load hotels from both CSV files:
 *    - hotels.csv (Quận 3 data)
 *    - district1.csv (Quận 1 data)
 * 3. Merge both datasets into one array
 * 4. Store in cache for next time
 * 5. Return the complete combined array
 * 
 * Returns: Promise<Hotel[]> - Array of all hotels from both districts
 * 
 * For beginners: This is an "async" function because file reading takes time.
 * You must use "await" when calling it: const hotels = await loadHotelsFromCSV();
 */
export const loadHotelsFromCSV = async (): Promise<Hotel[]> => {
  // Step 1: Check cache first (fast path)
  if (hotelsCache) {
    return hotelsCache;
  }

  // Step 2: Find CSV file location for hotels.csv
  // __dirname = current directory of this file (utils/)
  // '..' means go up one level to src/, then 'data' folder
  const csvPath = path.join(__dirname, '..', 'data', 'hotels.csv');
  
  // Step 3: Load from hotels.csv (Quận 3)
  const loadHotels = new Promise<Hotel[]>((resolve, reject) => {
    const hotels: Hotel[] = [];
    let idCounter = 1; // Generate IDs for each hotel

    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV file not found at: ${csvPath}`);
      reject(new Error(`CSV file not found at: ${csvPath}`));
      return;
    }

    // Read file as stream (good for large files)
    fs.createReadStream(csvPath)
      .pipe(csvParser()) // Parse CSV format
      .on('data', (row: any) => {
        // Parse each row
        try {
          // Convert CSV row to Hotel object
          const hotel: Hotel = {
            id: idCounter++,                                  // Auto-increment ID
            hotelname: row.hotelname || '',
            address: row.address || '',
            street: row.street || '',
            district: row.district || '',
            city: row.city || '',
            lat: parseFloat(row.lat) || 0,                    // Convert string to number
            lon: parseFloat(row.lng || row.lon) || 0,         // CSV uses 'lng', fallback to 'lon'
            searchString: row.searchString || '',
            categoryName: row.categoryName || '',
            categories: parseArrayString(row.categories),      // Parse array from string
            description1: row.description1 || '',
            description2: row.description2 || '',
            url_google: row.url_google || '',
            website: row.website || '',
            phone: row.phone || '',
            price: parsePrice(row.price),                      // Use helper function
            priceRange: row.price || '',                       // Keep original price range
            imageUrl: row.imageUrl || '',
            star: parseStarRating(row.star),                   // Parse star from text like "Khách sạn 2 sao"
            rank: parseFloat(row.rank) || 0,
            totalScore: parseFloat(row.totalScore) || 0,
            oneStar: parseFloat(row.oneStar) || 0,
            twoStar: parseFloat(row.twoStar) || 0,
            threeStar: parseFloat(row.threeStar) || 0,
            fourStar: parseFloat(row.fourStar) || 0,
            fiveStar: parseFloat(row.fiveStar) || 0,
            reviewsCount: parseFloat(row.reviewsCount) || 0,
            amenities: parseArrayString(row.amenities),        // Parse array from string
            reviews: parseArrayString(row.reviews),            // Parse array from string
            alln: row.alln || '',
          };
          
          hotels.push(hotel); // Add to array
        } catch (error) {
          console.error('Error parsing hotels.csv row:', error);
        }
      })
      .on('end', () => {
        console.log(`Loaded ${hotels.length} hotels from hotels.csv (Quận 3)`);
        resolve(hotels);
      })
      .on('error', (error: Error) => {
        console.error('Error reading hotels.csv:', error);
        reject(error);
      });
  });

  // Step 4: Load hotels and cache
  try {
    const hotels = await loadHotels;
    
    console.log(`Total hotels loaded: ${hotels.length} from data/hotels.csv`);
    
    // Step 5: Cache and return
    hotelsCache = hotels;
    return hotels;
  } catch (error) {
    console.error('Error loading hotels:', error);
    throw error;
  }
};

// ========================================
// UTILITY: CLEAR CACHE
// ========================================
/**
 * Clears the hotel cache
 * 
 * Use this when:
 * - CSV file has been updated
 * - You want to force reload from disk
 * - Testing/debugging
 * 
 * For beginners: This resets the cache to null, so the next call to
 * loadHotelsFromCSV() will read from the file again.
 */
export const clearHotelsCache = (): void => {
  hotelsCache = null;
};
