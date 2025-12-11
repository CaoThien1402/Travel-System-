import { Router, Request, Response } from 'express';

const router = Router();

// Định nghĩa Route: POST /
// Khi ghép vào index.ts, đường dẫn đầy đủ là: http://localhost:5000/api/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    // Validate đầu vào
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[Node] Gửi sang Python: "${message}"`);

    // 1. GỌI SANG PYTHON (Cổng 8000)
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

    // 2. NHẬN KẾT QUẢ
    // Dùng 'as any' để tránh lỗi TypeScript 'data is unknown'
    const data = await pythonResponse.json() as any;

    // 3. TRẢ VỀ FRONTEND
    // Frontend đợi key: 'response' (text) và 'sources' (list hotel)
    return res.status(200).json({
      response: data.answer,       // Mapping: Python 'answer' -> Node 'response'
      sources: data.hotels || [],  // Mapping: Python 'hotels' -> Node 'sources'
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lỗi Chat:', error);
    // Trả về 500 nhưng có kèm JSON để Frontend hiển thị thông báo đẹp
    return res.status(500).json({ 
      error: 'Internal Server Error',
      response: 'Hệ thống AI đang khởi động hoặc gặp sự cố. Vui lòng kiểm tra terminal Python (Port 8000).',
      sources: []
    });
  }
});

export default router;