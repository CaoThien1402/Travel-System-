import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Hotel, Heart, User, TrendingUp, MapPin, Star, Sparkles, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const stats = [
    { 
      label: 'Yêu thích', 
      value: '0', 
      icon: Heart, 
      gradient: 'from-pink-500 to-rose-500',
      bgColor: 'bg-gradient-to-br from-pink-50 to-rose-100',
      iconColor: 'text-pink-600',
      shadowColor: 'shadow-pink-200'
    },
    { 
      label: 'Đã xem', 
      value: '0', 
      icon: MapPin, 
      gradient: 'from-violet-500 to-purple-500',
      bgColor: 'bg-gradient-to-br from-violet-50 to-purple-100',
      iconColor: 'text-violet-600',
      shadowColor: 'shadow-violet-200'
    },
    { 
      label: 'Điểm tích lũy', 
      value: '0', 
      icon: Star, 
      gradient: 'from-amber-500 to-orange-500',
      bgColor: 'bg-gradient-to-br from-amber-50 to-orange-100',
      iconColor: 'text-amber-600',
      shadowColor: 'shadow-amber-200'
    },
  ];

  const quickActions = [
    { label: 'Tìm khách sạn', description: 'Khám phá hàng nghìn khách sạn', path: '/search', icon: Hotel, gradient: 'from-blue-500 via-blue-600 to-indigo-600' },
    { label: 'Yêu thích', description: 'Danh sách đã lưu', path: '/wishlist', icon: Heart, gradient: 'from-pink-500 via-rose-500 to-red-500' },
    { label: 'Hồ sơ cá nhân', description: 'Quản lý tài khoản', path: '/profile', icon: User, gradient: 'from-emerald-500 via-green-500 to-teal-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
              
              <div className="flex items-center justify-between flex-wrap gap-6 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    <span className="text-blue-100 text-sm font-medium">Chào mừng trở lại</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-3">
                    Xin chào, {profile?.full_name || user?.email?.split('@')[0] || 'Bạn'}! 👋
                  </h1>
                  <p className="text-blue-100 text-lg">
                    Chúc bạn có một ngày tuyệt vời với 3T2M1Stay
                  </p>
                </div>
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                  <User className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl border-0 shadow-lg">
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.iconColor}`} />
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">{stat.value}</h3>
                  <p className="text-xs md:text-sm font-medium text-gray-500">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="mb-8 overflow-hidden rounded-2xl border-0 shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Hotel className="w-5 h-5 text-white" />
                </div>
                Thao tác nhanh
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className={`bg-gradient-to-r ${action.gradient} text-white p-4 md:p-6 rounded-2xl flex flex-col items-center md:items-start gap-3 hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl group`}
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <action.icon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="font-bold text-sm md:text-base">{action.label}</h3>
                      <p className="text-white/80 text-xs hidden md:block">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* User Info Card */}
          <Card className="overflow-hidden rounded-2xl border-0 shadow-lg">
            <div className="bg-gradient-to-r from-gray-50 to-slate-100 p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                Thông tin tài khoản
              </h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl">
                  <dt className="text-xs md:text-sm font-medium text-gray-500">Họ tên</dt>
                  <dd className="text-sm md:text-base font-semibold text-gray-800">{profile?.full_name || 'Chưa cập nhật'}</dd>
                </div>
                <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl">
                  <dt className="text-xs md:text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm md:text-base font-semibold text-gray-800 truncate">{user?.email}</dd>
                </div>
                <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl">
                  <dt className="text-xs md:text-sm font-medium text-gray-500">Ngày tạo</dt>
                  <dd className="text-sm md:text-base font-semibold text-gray-800">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                  </dd>
                </div>
                <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl">
                  <dt className="text-xs md:text-sm font-medium text-gray-500">Trạng thái</dt>
                  <dd>
                    <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-700">
                      ✓ Đã xác thực
                    </span>
                  </dd>
                </div>
              </dl>
              <div className="mt-6">
                <Button
                  onClick={() => navigate('/profile')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl px-6 py-3 h-auto font-semibold shadow-lg"
                >
                  Chỉnh sửa thông tin
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};