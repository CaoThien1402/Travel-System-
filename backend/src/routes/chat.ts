import { Router, Request, Response } from 'express';
import { loadHotelsFromCSV } from '../utils/csvReader';

const router = Router();

/**
 * Normalize text for loose matching (accent-insensitive, lowercase, remove non-alnum)
 */
function normText(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Cache to avoid reading CSV every request
let HOTELS_CACHE: any[] | null = null;
let HOTELS_CACHE_AT = 0;
const HOTELS_CACHE_TTL_MS = 5 * 60 * 1000;

async function getHotelsCache(): Promise<any[]> {
  const now = Date.now();
  if (!HOTELS_CACHE || (now - HOTELS_CACHE_AT) > HOTELS_CACHE_TTL_MS) {
    HOTELS_CACHE = await loadHotelsFromCSV();
    HOTELS_CACHE_AT = now;
  }
  return HOTELS_CACHE!;
}

function enrichHotelsWithIdAndLink(pyHotels: any[], allHotels: any[]): any[] {
  // Build a map from normalized name -> hotel object (first wins)
  const map = new Map<string, any>();
  for (const h of allHotels) {
    const key = normText(h.hotelname || h.name || '');
    if (key && !map.has(key)) map.set(key, h);
  }

  return pyHotels
    .filter((h) => h && (h.hotelname || h.name))
    .map((h) => {
      const out = { ...h };
      const key = normText(out.hotelname || out.name || '');
      const match = key ? map.get(key) : undefined;

      // Attach id + link if found
      if (match?.id != null) {
        out.id = out.id ?? match.id;
        out.detail_path = out.detail_path ?? `/properties/${match.id}`;
        out.detail_url = out.detail_url ?? `/properties/${match.id}`;
      }

      // Prefer imageUrl from python if present; fallback to backend CSV
      out.imageUrl = out.imageUrl || out.image_url || match?.imageUrl || match?.image_url || '';
      out.image_url = out.image_url || out.imageUrl;

      return out;
    });
}

// Định nghĩa Route: POST /chat
// Khi ghép vào index.ts, đường dẫn đầy đủ là: http://localhost:5000/api/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    // Validate đầu vào
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[Node] Gửi sang Python: "${message}"`);

    // 1) GỌI SANG PYTHON (Cổng 8000)
    const pythonResponse = await fetch('http://127.0.0.1:8000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message, // Python api.py đợi key là 'query'
        top_k: 5
      }),
    });

    if (!pythonResponse.ok) {
      throw new Error(`Python Server Error: ${pythonResponse.statusText}`);
    }

    // 2) NHẬN KẾT QUẢ
    const data = await pythonResponse.json() as any;

    // Python mới trả: { answer, hotels }
    // Nhưng để an toàn, fallback nhiều shape:
    const rawHotels =
      (Array.isArray(data?.hotels) && data.hotels) ||
      (Array.isArray(data?.tool_result?.results) && data.tool_result.results) ||
      (Array.isArray(data?.sources) && data.sources) ||
      [];

    // 3) ENRICH: gắn id + link detail + imageUrl (dựa trên CSV backend)
    let enrichedHotels = rawHotels;
    try {
      const allHotels = await getHotelsCache();
      enrichedHotels = enrichHotelsWithIdAndLink(rawHotels, allHotels);
    } catch (e) {
      console.warn('[Node] Không enrich được hotels từ CSV:', e);
    }

    // 4) TRẢ VỀ FRONTEND
    // Giữ compatibility: trả cả 'hotels' và 'sources'
    return res.status(200).json({
      response: data.answer || data.response || '',
      hotels: enrichedHotels,
      sources: enrichedHotels,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lỗi Chat:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      response: 'Hệ thống AI đang khởi động hoặc gặp sự cố. Vui lòng kiểm tra terminal Python (Port 8000).',
      hotels: [],
      sources: []
    });
  }
});

export default router;
