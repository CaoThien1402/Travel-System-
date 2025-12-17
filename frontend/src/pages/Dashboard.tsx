import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Hotel, Heart, Calendar, User, TrendingUp, MapPin, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const stats = [
    { 
      label: 'Đặt phòng', 
      value: '0', 
      icon: Calendar, 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    { 
      label: 'Yêu thích', 
      value: '0', 
      icon: Heart, 
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-600'
    },
    { 
      label: 'Đã xem', 
      value: '0', 
      icon: MapPin, 
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    { 
      label: 'Điểm tích lũy', 
      value: '0', 
      icon: Star, 
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600'
    },
  ];

  const quickActions = [
    { label: 'Tìm khách sạn', path: '/search', icon: Hotel, color: 'bg-gradient-to-r from-blue-500 to-blue-600' },
    { label: 'Yêu thích', path: '/wishlist', icon: Heart, color: 'bg-gradient-to-r from-pink-500 to-pink-600' },
    { label: 'Đặt phòng', path: '/bookings', icon: Calendar, color: 'bg-gradient-to-r from-purple-500 to-purple-600' },
    { label: 'Hồ sơ', path: '/profile', icon: User, color: 'bg-gradient-to-r from-green-500 to-green-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-8 text-white shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    Xin chào, {profile?.full_name || user?.email?.split('@')[0] || 'Bạn'}! 👋
                  </h1>
                  <p className="text-blue-100 text-lg">
                    Chúc bạn có một ngày tuyệt vời với 3T2M1Stay
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                    </div>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">{stat.value}</h3>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="mb-8 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Hotel className="w-5 h-5 text-primary" />
                Thao tác nhanh
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className={`${action.color} text-white h-24 flex-col gap-2 hover:scale-105 transition-transform shadow-md`}
                  >
                    <action.icon className="w-6 h-6" />
                    <span className="font-semibold">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          {/* User Info Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Thông tin tài khoản
              </h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-muted-foreground">Họ tên</dt>
                  <dd className="text-base font-semibold text-foreground">{profile?.full_name || 'Chưa cập nhật'}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="text-base font-semibold text-foreground">{user?.email}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-muted-foreground">Ngày tạo</dt>
                  <dd className="text-base font-semibold text-foreground">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-muted-foreground">Trạng thái</dt>
                  <dd className="mt-1">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      ✓ Đã xác thực
                    </span>
                  </dd>
                </div>
              </dl>
              <div className="mt-6">
                <Button
                  onClick={() => navigate('/profile')}
                  className="bg-primary hover:bg-primary/90"
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