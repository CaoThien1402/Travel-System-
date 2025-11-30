/**
 * AI Chatbot Routes - Handles intelligent hotel search conversations
 * 
 * This file implements a simple keyword-based chatbot that helps users
 * find hotels based on their preferences.
 * 
 * Features:
 * - Greets users
 * - Searches hotels by location (districts)
 * - Filters by price range
 * - Returns top 5 recommendations
 * 
 * For beginners: This is a simple chatbot. You can enhance it with:
 * - Real AI (OpenAI, Google Gemini)
 * - Natural language processing
 * - Conversation memory
 */

import { Router, Request, Response } from 'express';
import { loadHotelsFromCSV } from '../utils/csvReader';

const router = Router();

// Data structures for chatbot
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

// ========================================
// HOTEL SEARCH BY KEYWORDS
// ========================================
/**
 * Simple keyword matching to find hotels
 * Freshers: This function shows how to filter arrays based on conditions
 */
const searchHotelsByKeywords = async (query: string) => {
  const hotels = await loadHotelsFromCSV();
  const queryLower = query.toLowerCase();
  
  // Keywords to look for in user's message
  const locationKeywords = [
    'quận 1', 'quận 3', 'quận 4', 'quận 5', 'quận 7', 
    'quận 10', 'thủ đức', 'bình thạnh', 'tân bình'
  ];
  
  let filteredHotels = hotels;
  
  // Filter by location if user mentions a district
  const foundLocation = locationKeywords.find(loc => queryLower.includes(loc));
  if (foundLocation) {
    filteredHotels = filteredHotels.filter(h => 
      h.district.toLowerCase().includes(foundLocation)
    );
  }
  
  // Filter by price range based on keywords
  if (queryLower.includes('rẻ') || queryLower.includes('giá tốt') || queryLower.includes('bình dân')) {
    // Budget hotels: less than 1 million VND
    filteredHotels = filteredHotels.filter(h => h.price < 1000000);
  } else if (queryLower.includes('cao cấp') || queryLower.includes('sang trọng')) {
    // Luxury hotels: more than 2 million VND
    filteredHotels = filteredHotels.filter(h => h.price > 2000000);
  }
  
  // Filter by star rating
  if (queryLower.includes('5 sao')) {
    filteredHotels = filteredHotels.filter(h => h.star >= 5);
  } else if (queryLower.includes('4 sao')) {
    filteredHotels = filteredHotels.filter(h => h.star >= 4);
  } else if (queryLower.includes('3 sao')) {
    filteredHotels = filteredHotels.filter(h => h.star >= 3);
  }
  
  // Sort by star rating (best first) and return top 5
  filteredHotels.sort((a, b) => (b.star || 0) - (a.star || 0));
  return filteredHotels.slice(0, 5);
};

// ========================================
// GENERATE AI RESPONSES
// ========================================
/**
 * Generate appropriate response based on user's message
 * Freshers: This shows how to use if-else logic to handle different scenarios
 */
const generateResponse = async (message: string): Promise<string> => {
  const messageLower = message.toLowerCase();
  
  // Case 1: User is greeting
  if (messageLower.includes('xin chào') || messageLower.includes('hello') || messageLower.includes('hi')) {
    return 'Xin chào! Tôi là trợ lý AI của 3T2M1Stay. Tôi có thể giúp bạn tìm khách sạn, homestay phù hợp. Bạn muốn tìm phòng ở khu vực nào?';
  }
  
  // Case 2: User asks for help
  if (messageLower.includes('giúp') || messageLower.includes('làm gì') || messageLower.includes('hỗ trợ')) {
    return 'Tôi có thể giúp bạn:\n- Tìm khách sạn theo khu vực\n- Tìm theo mức giá\n- Gợi ý khách sạn tốt nhất\n- Thông tin về tiện ích\n\nBạn muốn tìm khách sạn ở đâu?';
  }
  
  // Case 3: User is searching for hotels
  if (messageLower.includes('tìm') || messageLower.includes('khách sạn') || 
      messageLower.includes('homestay') || messageLower.includes('quận') ||
      messageLower.includes('giá')) {
    
    // Search for matching hotels
    const hotels = await searchHotelsByKeywords(message);
    
    // If no hotels found
    if (hotels.length === 0) {
      return 'Xin lỗi, tôi không tìm thấy khách sạn phù hợp với yêu cầu của bạn. Bạn có thể thử:\n- Tìm ở khu vực khác\n- Điều chỉnh mức giá\n- Hỏi tôi gợi ý khách sạn tốt nhất';
    }
    
    // Format response with hotel list
    let response = `Tôi tìm thấy ${hotels.length} khách sạn phù hợp:\n\n`;
    
    hotels.forEach((hotel, index) => {
      response += `${index + 1}. **${hotel.hotelname}**\n`;
      response += `   📍 ${hotel.district}\n`;
      response += `   💰 ${(hotel.price / 1000000).toFixed(1)} triệu VND/đêm\n`;
      response += `   ⭐ ${hotel.star || 'N/A'} sao\n\n`;
    });
    
    response += 'Bạn muốn biết thêm thông tin về khách sạn nào?';
    return response;
  }
  
  // Default: User's question doesn't match any pattern
  return 'Tôi có thể giúp bạn tìm khách sạn. Hãy cho tôi biết:\n- Bạn muốn ở khu vực nào?\n- Ngân sách của bạn là bao nhiêu?\n- Bạn cần những tiện ích gì?';
};

// ========================================
// CHAT ENDPOINT
// ========================================
/**
 * POST /api/chat
 * Main endpoint for chatbot conversations
 * 
 * Request body: { message: string, history?: [] }
 * Response: { response: string, timestamp: string }
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history }: ChatRequest = req.body;
    
    // Validation: Check if message exists
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Generate AI response
    const response = await generateResponse(message);
    
    // Send response back to client
    return res.status(200).json({ 
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ 
      error: 'Failed to process chat message',
      response: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.'
    });
  }
});

export default router;
