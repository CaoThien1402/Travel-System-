import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase';

// Extend Express Request để thêm user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// ==========================================
//  MIDDLEWARE XÁC THỰC TOKEN
// ==========================================
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token! Vui lòng đăng nhập.'
      });
    }

    // Verify token với Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn!'
      });
    }

    // Gắn user vào request để dùng trong các routes
    req.user = user;
    next();

  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực token!'
    });
  }
};

// ==========================================
//  MIDDLEWARE KIỂM TRA ADMIN (Optional)
// ==========================================
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập!'
      });
    }

    // Kiểm tra role trong metadata hoặc database
    const isAdmin = req.user.user_metadata?.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập!'
      });
    }

    next();

  } catch (error: any) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra quyền admin!'
    });
  }
};