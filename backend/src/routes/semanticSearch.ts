/**
 * Semantic Search Route - Gọi Python script để semantic search
 * 
 * Route này spawn Python process để thực hiện semantic search
 * sử dụng Vietnamese Embedding + Cosine Similarity.
 * 
 * KHÔNG cần chạy terminal Python riêng - Python được gọi từ Node.js
 */

import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { loadHotelsFromCSV } from '../utils/csvReader';

const router = Router();

// Đường dẫn đến Python script
const PYTHON_SCRIPT = path.join(__dirname, '..', 'python', 'semantic_search.py');

// Timeout cho Python process (ms)
const PYTHON_TIMEOUT = 120000; // 120 giây (tăng lên cho lần đầu load model)

/**
 * Xác định Python command phù hợp với Windows
 */
function getPythonCommand(): string {
  // Trên Windows, thử python3 trước, sau đó python
  return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * Gọi Python script và trả về kết quả
 */
function runPythonSearch(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonCmd = getPythonCommand();
    
    // Quote path để handle dấu cách trong đường dẫn
    const quotedScript = `"${PYTHON_SCRIPT}"`;
    
    // Quote các arguments có dấu cách hoặc ký tự đặc biệt
    const quotedArgs = args.map(arg => {
      if (arg.includes(' ') || arg.includes(',') || arg.includes('&')) {
        return `"${arg}"`;
      }
      return arg;
    });
    
    console.log(`[Python] Spawning: ${pythonCmd} ${quotedScript} ${quotedArgs.join(' ')}`);
    
    // Không dùng shell: true với args array - dùng command string thay vì
    const fullCommand = `${pythonCmd} ${quotedScript} ${quotedArgs.join(' ')}`;
    
    const pythonProcess = spawn(fullCommand, {
      shell: true, // Important for Windows
      timeout: PYTHON_TIMEOUT,
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      // Log stderr để debug (không phải lỗi, có thể là progress)
      console.log(`[Python] ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse JSON output từ Python
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout.substring(0, 500)}`));
        }
      } else {
        const errorMsg = stderr || stdout || 'Unknown error';
        reject(new Error(`Python process exited with code ${code}. Last output: ${errorMsg.substring(0, 500)}`));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}. Make sure Python is installed and in PATH.`));
    });

    // Handle timeout explicitly
    setTimeout(() => {
      if (!pythonProcess.killed) {
        console.error('[Python] Process timeout - killing process');
        pythonProcess.kill();
        reject(new Error(`Python process timeout after ${PYTHON_TIMEOUT}ms`));
      }
    }, PYTHON_TIMEOUT);
  });
}

/**
 * Fallback: Simple search khi Python không available
 */
async function fallbackSimpleSearch(
  query: string,
  filters: { min_price?: number; max_price?: number; min_star?: number; district?: string }
): Promise<any> {
  console.log('[Semantic Search] Fallback to simple search');
  
  const hotels = await loadHotelsFromCSV();
  const searchLower = (query || '').toLowerCase();
  
  let filtered = hotels;
  
  // Text search
  if (searchLower) {
    filtered = filtered.filter(hotel =>
      hotel.hotelname.toLowerCase().includes(searchLower) ||
      hotel.address.toLowerCase().includes(searchLower) ||
      hotel.district.toLowerCase().includes(searchLower) ||
      hotel.searchString.toLowerCase().includes(searchLower)
    );
  }
  
  // Price filter
  if (filters.min_price) {
    filtered = filtered.filter(h => h.price >= filters.min_price!);
  }
  if (filters.max_price) {
    filtered = filtered.filter(h => h.price <= filters.max_price!);
  }
  
  // Star filter
  if (filters.min_star && filters.min_star > 0) {
    filtered = filtered.filter(h => h.star >= filters.min_star!);
  }
  
  // District filter
  if (filters.district && filters.district !== 'Tất cả') {
    filtered = filtered.filter(h => 
      h.district.toLowerCase().includes(filters.district!.toLowerCase())
    );
  }
  
  return {
    success: true,
    query: query,
    total: filtered.length,
    hotels: filtered.slice(0, 50),
    method: 'simple_search'
  };
}

/**
 * POST /semantic-search
 * 
 * Tìm kiếm khách sạn bằng semantic search.
 */
router.post('/semantic-search', async (req: Request, res: Response) => {
  try {
    const { query, top_k = 20, min_price, max_price, min_star, district } = req.body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'Query is required',
        hotels: [] 
      });
    }

    console.log(`[Semantic Search] Query: "${query}"`);

    // Build arguments cho Python script
    const args = ['--query', query.trim(), '--top_k', String(top_k || 20)];
    
    if (min_price) args.push('--min_price', String(min_price));
    if (max_price) args.push('--max_price', String(max_price));
    if (min_star) args.push('--min_star', String(min_star));
    if (district) args.push('--district', district);

    try {
      const result = await runPythonSearch(args);
      
      if (result.success) {
        return res.status(200).json({
          ...result,
          method: 'semantic_search'
        });
      } else {
        // Python trả về lỗi, fallback
        console.error('[Semantic Search] Python error:', result.error);
        const fallback = await fallbackSimpleSearch(query, { min_price, max_price, min_star, district });
        return res.status(200).json(fallback);
      }
    } catch (pythonError) {
      // Python không chạy được, fallback
      console.error('[Semantic Search] Python failed:', pythonError);
      const fallback = await fallbackSimpleSearch(query, { min_price, max_price, min_star, district });
      return res.status(200).json(fallback);
    }

  } catch (error) {
    console.error('[Semantic Search] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Search failed',
      hotels: []
    });
  }
});

/**
 * GET /semantic-search (cho dễ test trên browser)
 */
router.get('/semantic-search', async (req: Request, res: Response) => {
  const { query, top_k, min_price, max_price, min_star, district } = req.query;
  
  if (!query) {
    return res.status(400).json({ success: false, error: 'Query is required', hotels: [] });
  }

  // Forward sang POST handler
  req.body = {
    query: query as string,
    top_k: top_k ? parseInt(top_k as string) : 20,
    min_price: min_price ? parseFloat(min_price as string) : undefined,
    max_price: max_price ? parseFloat(max_price as string) : undefined,
    min_star: min_star ? parseInt(min_star as string) : undefined,
    district: district as string || undefined
  };

  // Gọi lại POST handler
  const postHandler = router.stack.find(r => r.route?.path === '/semantic-search' && r.route?.methods?.post);
  if (postHandler) {
    return postHandler.route.stack[0].handle(req, res, () => {});
  }
  
  return res.status(500).json({ success: false, error: 'Handler not found' });
});

/**
 * POST /create-embeddings
 * 
 * Tạo file embeddings (chạy một lần khi setup)
 */
router.post('/create-embeddings', async (req: Request, res: Response) => {
  try {
    console.log('[Semantic Search] Creating embeddings...');
    
    const result = await runPythonSearch(['--create-embeddings']);
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Semantic Search] Create embeddings failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create embeddings'
    });
  }
});

export default router;
