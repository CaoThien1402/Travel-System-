import { Router, Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../supabase';

const router = Router();

// ==========================================
// 🔐 ĐĂNG KÝ TÀI KHOẢN MỚI
// ==========================================
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email và password là bắt buộc!'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password phải có ít nhất 6 ký tự!'
      });
    }

    // Đăng ký với Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
        // Email confirmation sẽ được gửi tự động
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Tạo profile trong bảng profiles (nếu có)
    if (data.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName || '',
          avatar_url: null,
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.',
      user: {
        id: data.user?.id,
        email: data.user?.email
      }
    });

  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng ký!'
    });
  }
});

// ==========================================
// 🔓 ĐĂNG NHẬP
// ==========================================
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email và password là bắt buộc!'
      });
    }

    // Đăng nhập với Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc password không đúng!'
      });
    }

    // Kiểm tra email đã được confirm chưa
    if (!data.user?.email_confirmed_at) {
      return res.status(403).json({
        success: false,
        message: 'Vui lòng xác nhận email trước khi đăng nhập!'
      });
    }

    // Lấy thông tin profile từ database
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || '',
        avatar_url: profile?.avatar_url || null
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng nhập!'
    });
  }
});

// ==========================================
// 🚪 ĐĂNG XUẤT
// ==========================================
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Revoke token on Supabase
      await supabase.auth.signOut();
    }

    return res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công!'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đăng xuất!'
    });
  }
});

// ==========================================
// 👤 LẤY THÔNG TIN USER HIỆN TẠI
// ==========================================
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token!'
      });
    }

    // Verify token và lấy user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ!'
      });
    }

    // Lấy profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || '',
        avatar_url: profile?.avatar_url || null,
        created_at: profile?.created_at
      }
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin user!'
    });
  }
});

// ==========================================
// 📧 GỬI LẠI EMAIL XÁC NHẬN
// ==========================================
router.post('/resend-confirmation', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc!'
      });
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email xác nhận đã được gửi lại!'
    });

  } catch (error: any) {
    console.error('Resend confirmation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi email xác nhận!'
    });
  }
});

// ==========================================
// 🔑 QUÊN MẬT KHẨU - GỬI EMAIL RESET
// ==========================================
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc!'
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email reset password đã được gửi!'
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi email reset password!'
    });
  }
});

// ==========================================
// 🔄 ĐỔI MẬT KHẨU
// ==========================================
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token và password mới là bắt buộc!'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password phải có ít nhất 6 ký tự!'
      });
    }

    // Verify token và update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công!'
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đổi mật khẩu!'
    });
  }
});

export default router;