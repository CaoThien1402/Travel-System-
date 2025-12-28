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
  if (!HOTELS_CACHE || now - HOTELS_CACHE_AT > HOTELS_CACHE_TTL_MS) {
    HOTELS_CACHE = await loadHotelsFromCSV();
    HOTELS_CACHE_AT = now;
  }
  return HOTELS_CACHE!;
}

function enrichHotelsWithIdAndLink(pyHotels: any[], allHotels: any[]): any[] {
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

      if (match?.id != null) {
        out.id = out.id ?? match.id;
        out.detail_path = out.detail_path ?? `/properties/${match.id}`;
        out.detail_url = out.detail_url ?? `/properties/${match.id}`;
      }

      out.imageUrl = out.imageUrl || out.image_url || match?.imageUrl || match?.image_url || '';
      out.image_url = out.image_url || out.imageUrl;

      // fallback district if missing
      out.district = out.district || match?.district || '';
      out.district_num = out.district_num ?? match?.district_num ?? null;

      return out;
    });
}

/**
 * Convert amenities/description that might look like:
 * "['WiFi miễn phí', 'Hồ bơi', ...]" or JSON array or normal string
 * into a clean string array.
 */
function toCleanArray(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean);

  let s = String(raw).trim();
  if (!s) return [];

  // If looks like a Python list string: "['a', 'b']"
  if (s.startsWith('[') && s.endsWith(']')) {
    // Try JSON parse after converting single quotes to double quotes
    try {
      const jsonLike = s.replace(/'/g, '"');
      const arr = JSON.parse(jsonLike);
      if (Array.isArray(arr)) return arr.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      // fallback below
    }

    // fallback: strip brackets and split by comma
    s = s.slice(1, -1);
  }

  // Remove quotes/brackets leftovers
  s = s.replace(/[\[\]"']/g, ' ');
  const parts = s
    .split(/[,•\n\r\t]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  return parts;
}

function uniqPush(list: string[], v: string) {
  const key = v.toLowerCase();
  if (!list.some((x) => x.toLowerCase() === key)) list.push(v);
}

/**
 * Pretty formatter
 */
function formatVnd(n: any): string {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '';
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    const str = (Math.round(m * 10) / 10).toString().replace('.', ',');
    return `${str} triệu`;
  }
  return `${Math.round(v).toLocaleString('vi-VN')}đ`;
}

function districtLabel(h: any): string {
  const dn = h?.district_num;
  if (Number.isFinite(Number(dn)) && Number(dn) > 0) return `Quận ${Number(dn)}`;
  const d = (h?.district || '').toString().trim();
  return d || '—';
}

function priceLabel(h: any): string {
  const pmin = h?.price_min_vnd;
  const pmax = h?.price_max_vnd;
  const pmid = h?.price_vnd;

  const smin = formatVnd(pmin);
  const smax = formatVnd(pmax);
  const smid = formatVnd(pmid);

  if (smin && smax && Number(pmin) !== Number(pmax)) return `${smin} – ${smax} /đêm`;
  if (smin) return `Từ ${smin} /đêm`;
  if (smid) return `Khoảng ${smid} /đêm`;
  const txt = (h?.price_text || '').toString().trim();
  return txt && txt.toLowerCase() !== 'chưa cập nhật giá' ? txt : 'Chưa cập nhật giá';
}

/**
 * Extract nice “chips” like booking sites
 * - ưu tiên từ amenities, fallback sang description
 */
function pickHighlights(h: any): string[] {
  const out: string[] = [];

  const amenitiesArr = toCleanArray(h?.amenities);
  const descArr = toCleanArray(h?.description);

  const haystack = `${amenitiesArr.join(' • ')} • ${descArr.join(' • ')}`.toLowerCase();

  const rules: Array<[RegExp, string]> = [
    [/wifi|wi fi/, 'WiFi miễn phí'],
    [/pool|hồ bơi/, 'Hồ bơi'],
    [/breakfast|bữa sáng/, 'Bữa sáng'],
    [/parking|đậu xe|bai do/, 'Đậu xe'],
    [/gym|fitness|phòng gym/, 'Phòng gym'],
    [/spa/, 'Spa'],
    [/airport|sân bay/, 'Gần sân bay'],
    [/family|gia đình/, 'Phù hợp gia đình'],
    [/center|trung tâm|downtown/, 'Gần trung tâm'],
  ];

  for (const [re, label] of rules) {
    if (re.test(haystack)) {
      uniqPush(out, label);
      if (out.length >= 3) return out;
    }
  }

  // fallback: lấy trực tiếp từ amenities sạch
  for (const a of amenitiesArr) {
    const t = a.trim();
    if (t.length < 3 || t.length > 26) continue;
    uniqPush(out, t);
    if (out.length >= 3) break;
  }

  return out;
}

/**
 * Badges: 2-3 tag trên ảnh (gọn, có “cảm giác booking”)
 */
function makeBadges(h: any): string[] {
  const badges: string[] = [];

  const dn = Number(h?.district_num);
  const rating = Number(h?.rating);
  const star = Number(h?.star);
  const pmin = Number(h?.price_min_vnd);

  // Trung tâm
  if (Number.isFinite(dn) && [1, 3, 5].includes(dn)) badges.push('Trung tâm');

  // Rating scale: có nơi 0-5, có nơi 0-10
  if (Number.isFinite(rating) && rating > 0) {
    const isFiveScale = rating <= 5.0;
    const good = isFiveScale ? rating >= 4.4 : rating >= 8.8;
    if (good) badges.push('Được đánh giá cao');
  }

  // Cao cấp: dựa vào sao hoặc giá
  if (Number.isFinite(star) && star >= 4) badges.push('Cao cấp');
  else if (Number.isFinite(pmin) && pmin >= 1_500_000) badges.push('Cao cấp');

  // Giá tốt
  if (Number.isFinite(pmin) && pmin > 0 && pmin <= 700000) badges.push('Giá tốt');

  // giữ 2 badge cho “gọn” (ảnh của bạn đang hơi nhiều tag)
  return badges.slice(0, 2);
}

/**
 * Cải tiến câu nhận xét (match_reason):
 * - bỏ kiểu “đúng quận 1” máy móc
 * - thành bullet “•” dễ đọc
 */
function buildReason(h: any): string {
  const parts: string[] = [];

  const dn = Number(h?.district_num);
  const rating = Number(h?.rating);
  const pmin = Number(h?.price_min_vnd);

  if (Number.isFinite(dn) && [1, 3, 5].includes(dn)) parts.push('Gần trung tâm');
  else if ((h?.district || '').toString().trim()) parts.push('Đúng khu vực bạn chọn');

  if (Number.isFinite(rating) && rating > 0) {
    const isFiveScale = rating <= 5.0;
    const good = isFiveScale ? rating >= 4.3 : rating >= 8.6;
    if (good) parts.push('Được đánh giá tốt');
  }

  if (Number.isFinite(pmin) && pmin > 0 && pmin <= 900000) parts.push('Hợp ngân sách');

  // fallback: nếu python trả match_reason thì “làm sạch” lại
  if (!parts.length) {
    let r = (h?.match_reason || '').toString().trim();
    if (r) {
      r = r
        .replace(/đúng\s*quận\s*(\d+)/gi, 'Đúng Quận $1')
        .replace(/đánh giá tốt/gi, 'Được đánh giá tốt')
        .replace(/hợp ngân sách/gi, 'Hợp ngân sách')
        .replace(/\s*,\s*/g, ' • ');
      return r;
    }
    return 'Phù hợp nhu cầu';
  }

  return parts.slice(0, 3).join(' • ');
}

// POST /api/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, top_k, filters, history } = req.body;

    const k = Number.isFinite(Number(top_k)) ? Math.max(1, Math.min(50, Number(top_k))) : 10;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[Node] Gửi sang Python: "${message}"`);

    const pythonResponse = await fetch('http://127.0.0.1:8000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        top_k: k,
        filters: filters || null,
        history: history || null,
      }),
    });

    if (!pythonResponse.ok) {
      throw new Error(`Python Server Error: ${pythonResponse.statusText}`);
    }

    const data = (await pythonResponse.json()) as any;

    const rawHotels =
      (Array.isArray(data?.hotels) && data.hotels) ||
      (Array.isArray(data?.tool_result?.results) && data.tool_result.results) ||
      (Array.isArray(data?.sources) && data.sources) ||
      [];

    let enrichedHotels = rawHotels;
    try {
      const allHotels = await getHotelsCache();
      enrichedHotels = enrichHotelsWithIdAndLink(rawHotels, allHotels);
    } catch (e) {
      console.warn('[Node] Không enrich được hotels từ CSV:', e);
    }

    // Build UI-friendly fields
    const hotel_cards = (enrichedHotels || []).map((h: any) => {
      const rating = Number(h?.rating);
      const star = Number(h?.star);

      const reason = buildReason(h);

      return {
        ...h,
        // override match_reason để FE hiển thị đẹp
        match_reason: reason,
        ui: {
          district_label: districtLabel(h),
          price_label: priceLabel(h),
          rating_label: Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : '',
          star_label: Number.isFinite(star) && star > 0 ? `${star}` : '',
          badges: makeBadges(h),
          highlights: pickHighlights(h),
          cta_label: 'Xem chi tiết',
        },
      };
    });

    return res.status(200).json({
      response: data.answer || data.response || '',
      hotels: hotel_cards,
      sources: hotel_cards,
      top_k: k,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Lỗi Chat:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      response: 'Hệ thống AI đang khởi động hoặc gặp sự cố. Vui lòng kiểm tra terminal Python (Port 8000).',
      hotels: [],
      sources: [],
    });
  }
});

export default router;
