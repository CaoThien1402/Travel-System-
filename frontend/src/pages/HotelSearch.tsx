import { useState, useEffect } from 'react';
import { MapPin, Star, DollarSign, Filter, Search, Hotel as HotelIcon, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Link, useNavigate } from 'react-router-dom';
import HotelMap from '@/components/HotelMap';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Hotel {
  id: number;
  hotelname: string;
  address: string;
  district: string;
  price: number;
  star: number;
  lat: number;
  lon: number;
  imageUrl?: string;
  reviewsCount?: number;
  totalScore?: number;
}

// Component để hiển thị ảnh với fallback
const HotelImage = ({ src, alt }: { src?: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when src changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
        <HotelIcon className="w-8 h-8" />
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100 absolute inset-0">
          <div className="animate-pulse w-8 h-8 rounded-full bg-gray-300"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </>
  );
};

const HotelSearch = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  const [mapHotels, setMapHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState([0, 10000000]);
  const [minStars, setMinStars] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Helper function: Get featured hotels for map display
  const getFeaturedHotelsForMap = (hotelsList: Hotel[], maxCount: number = 100): Hotel[] => {
    // Prioritize hotels with: reviews, good ratings, reasonable price, valid coordinates
    return hotelsList
      .filter(h => h.lat !== 0 && h.lon !== 0) // Only hotels with valid coordinates
      .sort((a, b) => {
        // Score calculation: reviews count + rating + price factor
        const scoreA = (a.reviewsCount || 0) * 2 + (a.totalScore || 0) * 10 + (a.star || 0) * 5;
        const scoreB = (b.reviewsCount || 0) * 2 + (b.totalScore || 0) * 10 + (b.star || 0) * 5;
        return scoreB - scoreA;
      })
      .slice(0, maxCount); // Limit to top N hotels
  };

  // Fetch hotels from API
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/properties');
        const data = await response.json();
        // Ensure data is always an array
        const hotelsArray = Array.isArray(data) ? data : [];
        setHotels(hotelsArray);
        setFilteredHotels(hotelsArray);
      } catch (error) {
        console.error('Error fetching hotels:', error);
        // Set empty arrays on error to prevent .map errors
        setHotels([]);
        setFilteredHotels([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, []);

  // Filter hotels based on search and filters
  useEffect(() => {
    let filtered = hotels;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (h) =>
          h.hotelname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.district.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Price range filter
    filtered = filtered.filter(
      (h) => h.price >= priceRange[0] && h.price <= priceRange[1]
    );

    // Star rating filter
    if (minStars > 0) {
      filtered = filtered.filter((h) => h.star >= minStars);
    }

    setFilteredHotels(filtered);
    
    // Update map hotels with featured selection (limit to 100 best hotels)
    setMapHotels(getFeaturedHotelsForMap(filtered, 100));
  }, [searchQuery, priceRange, minStars, hotels]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header/Navbar */}
      <nav className="bg-white border-b shadow-sm z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-primary-hover flex items-center justify-center">
                <HotelIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">3T2M1Stay</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                Trang chủ
              </Link>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <User className="w-4 h-4 mr-2" />
                      {user.email}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="w-4 h-4 mr-2" />
                      Hồ sơ
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/bookings')}>
                      <HotelIcon className="w-4 h-4 mr-2" />
                      Đặt phòng của tôi
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Đăng xuất
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      <User className="w-4 h-4 mr-2" />
                      Đăng nhập
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="bg-primary hover:bg-primary-hover">
                      Đăng ký
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Search Filters */}
      <div className="bg-white border-b p-4 shadow-sm z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Tìm kiếm khách sạn, khu vực..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Bộ lọc
            </Button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex gap-6 items-center text-sm">
            <div className="flex-1">
              <label className="block text-gray-600 mb-2">
                Giá: {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} VNĐ
              </label>
              <Slider
                min={0}
                max={10000000}
                step={100000}
                value={priceRange}
                onValueChange={setPriceRange}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-2">Tối thiểu {minStars} sao</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    size="sm"
                    variant={minStars >= star ? "default" : "outline"}
                    onClick={() => setMinStars(star)}
                    className="w-10 h-10 p-0"
                  >
                    {star}⭐
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMinStars(0)}
                  className="text-xs"
                >
                  Xóa
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Map + Hotel List */}
      <div className="flex-1 flex overflow-hidden">
        {/* Hotel List (Left Side - 50%) */}
        <div className="w-1/2 border-r bg-gray-50">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-600 mb-4">
                Tìm thấy {filteredHotels.length} khách sạn
              </div>

              {isLoading ? (
                <div className="text-center py-12">Đang tải...</div>
              ) : filteredHotels.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Không tìm thấy khách sạn phù hợp
                </div>
              ) : (
                filteredHotels.map((hotel) => (
                  <div
                    key={hotel.id}
                    className={`bg-white rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg border-2 ${
                      selectedHotel?.id === hotel.id
                        ? 'border-primary shadow-lg'
                        : 'border-transparent'
                    }`}
                    onClick={() => navigate(`/properties/${hotel.id}`)}
                  >
                    <div className="flex gap-4">
                      {/* Hotel Image */}
                      <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 relative">
                        <HotelImage src={hotel.imageUrl} alt={hotel.hotelname} />
                      </div>

                      {/* Hotel Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate">
                          {hotel.hotelname}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-yellow-500">
                            {'⭐'.repeat(Math.floor(hotel.star))}
                          </div>
                          {hotel.reviewsCount && (
                            <span className="text-xs text-gray-500">
                              ({hotel.reviewsCount} đánh giá)
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          {hotel.district}
                        </p>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-xs text-gray-500">Giá mỗi đêm từ</div>
                            <div className="text-2xl font-bold text-primary">
                              {hotel.price.toLocaleString('vi-VN')} ₫
                            </div>
                          </div>
                          <Button size="sm" className="bg-primary hover:bg-primary/90">
                            Xem chi tiết
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Map (Right Side - 50%) */}
        <div className="w-1/2 relative p-4">
          <div className="h-full rounded-xl overflow-hidden shadow-lg">
            {mapHotels.length < filteredHotels.length && (
              <div className="absolute top-6 left-6 right-6 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">
                    Hiển thị <strong>{mapHotels.length}</strong> khách sạn tiêu biểu trên {filteredHotels.length} khách sạn
                  </span>
                  <span className="text-xs text-gray-500">
                    (Đánh giá cao nhất)
                  </span>
                </div>
              </div>
            )}
            <HotelMap
              hotels={mapHotels}
              onMarkerClick={setSelectedHotel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelSearch;
