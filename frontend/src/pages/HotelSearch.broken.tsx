import { useState, useEffect } from 'react';
import { MapPin, Star, DollarSign, Filter, Search, Hotel as HotelIcon, User, LogOut } from 'lucide-react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Link, useNavigate } from 'react-router-dom';
import HotelMap from '@/components/HotelMap';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  priceRange?: string;
  star: number;
  lat: number;
  lon: number;
  imageUrl?: string;
  reviewsCount?: number;
  totalScore?: number;
  searchString?: string;
}

interface FilterOptions {
  searchStrings: string[];
  districts: string[];
  priceRanges: { label: string; min: number; max: number }[];
  starRatings: number[];
  priceMin: number;
  priceMax: number;
  totalHotels: number;
}

// Fallback image placeholder (base64 encoded simple hotel icon placeholder)
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z'/%3E%3Cpath d='m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16'/%3E%3Cpath d='M8 7h.01'/%3E%3Cpath d='M16 7h.01'/%3E%3Cpath d='M12 7h.01'/%3E%3Cpath d='M12 11h.01'/%3E%3Cpath d='M16 11h.01'/%3E%3Cpath d='M8 11h.01'/%3E%3C/svg%3E";

// Component để hiển thị ảnh với fallback
const HotelImage = ({ src, alt }: { src?: string; alt: string }) => {
  const [imgSrc, setImgSrc] = useState(src || '');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (src !== imgSrc.split("?")[0]) {
      setImgSrc(src || '');
      setHasError(false);
      setIsLoading(true);
      setRetryCount(0);
    }
  }, [src, imgSrc]);

  const handleError = () => {
    if (retryCount < 2 && imgSrc) {
      // Retry with cache buster after a small delay
      setTimeout(() => {
        setRetryCount(c => c + 1);
        setImgSrc(`${src}?retry=${Date.now()}`);
      }, 500);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  if (!src || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
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
        src={imgSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={handleError}
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
  const [isSearching, setIsSearching] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedSearchString, setSelectedSearchString] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileList, setShowMobileList] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const filterOptions: FilterOptions = {
    searchStrings: ['Khách sạn', 'Resort', 'Villa', 'Homestay', 'Motel', 'Boutique hotel'],
    districts: [
      'Quận 1, Thành phố Hồ Chí Minh',
      'Quận 2, Thành phố Hồ Chí Minh',
      'Quận 3, Thành phố Hồ Chí Minh',
      'Quận 4, Thành phố Hồ Chí Minh',
      'Quận 5, Thành phố Hồ Chí Minh',
      'Quận 6, Thành phố Hồ Chí Minh',
      'Quận 7, Thành phố Hồ Chí Minh',
      'Quận 8, Thành phố Hồ Chí Minh',
      'Quận 10, Thành phố Hồ Chí Minh',
      'Quận 11, Thành phố Hồ Chí Minh',
      'Quận 12, Thành phố Hồ Chí Minh',
      'Bình Tân, Thành phố Hồ Chí Minh',
      'Bình Thạnh, Thành phố Hồ Chí Minh',
      'Gò Vấp, Thành phố Hồ Chí Minh',
      'Phú Nhuận, Thành phố Hồ Chí Minh',
      'Tân Bình, Thành phố Hồ Chí Minh',
      'Tân Phú, Thành phố Hồ Chí Minh',
      'Thủ Đức, Thành phố Hồ Chí Minh',
    ],
    priceRanges: [
      { label: 'Dưới 500K', min: 0, max: 500000 },
      { label: '500K - 1M', min: 500000, max: 1000000 },
      { label: '1M - 2M', min: 1000000, max: 2000000 },
      { label: '2M - 5M', min: 2000000, max: 5000000 },
      { label: 'Trên 5M', min: 5000000, max: 10000000 },
    ],
    starRatings: [5, 4, 3, 2, 1],
    priceMin: 0,
    priceMax: 10000000,
    totalHotels: 865,
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      performSemanticSearch(searchQuery);
    } else {
      applyLocalFilters(hotels);
    }
  };

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getFeaturedHotelsForMap = (hotelsList: Hotel[], maxCount: number = 100): Hotel[] => {
    return hotelsList
      .filter(h => h.lat !== 0 && h.lon !== 0)
      .sort((a, b) => {
        const scoreA = (a.reviewsCount || 0) * 2 + (a.totalScore || 0) * 10 + (a.star || 0) * 5;
        const scoreB = (b.reviewsCount || 0) * 2 + (b.totalScore || 0) * 10 + (b.star || 0) * 5;
        return scoreB - scoreA;
      })
      .slice(0, maxCount);
  };

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/properties');
        const data = await response.json();
        const hotelsArray = Array.isArray(data) ? data : [];
        console.log('Loaded', hotelsArray.length, 'hotels from API');
        setHotels(hotelsArray);
        setFilteredHotels(hotelsArray);
        setMapHotels(getFeaturedHotelsForMap(hotelsArray, 30));
      } catch (error) {
        console.error('Error fetching hotels:', error);
        setHotels([]);
        setFilteredHotels([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, []);

  const performSemanticSearch = async (query: string) => {
    if (!query.trim()) {
      applyLocalFilters(hotels);
      return;
    }

    setIsSearching(true);
    
    try {
      console.log('Semantic Search:', query);
      
      let minPrice = priceRange[0];
      let maxPrice = priceRange[1];
      
      if (selectedPriceRange !== 'all' && filterOptions) {
        const range = filterOptions.priceRanges.find(r => r.label === selectedPriceRange);
        if (range) {
          minPrice = range.min;
          maxPrice = range.max;
        }
      }
      
      const response = await fetch('http://localhost:5000/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          top_k: 10,
          min_price: minPrice > 0 ? minPrice : undefined,
          max_price: maxPrice < 10000000 ? maxPrice : undefined,
          min_star: minStars > 0 ? minStars : undefined,
          district: selectedDistrict !== 'all' ? selectedDistrict : undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success && Array.isArray(data.hotels)) {
        console.log('Found', data.hotels.length, 'results');
        setFilteredHotels(data.hotels);
        setMapHotels(getFeaturedHotelsForMap(data.hotels, 30));
      } else {
        console.warn('Semantic search returned no results, using local filter');
        applyLocalFilters(hotels);
      }
    } catch (error) {
      console.error('Semantic search error:', error);
      applyLocalFilters(hotels);
    } finally {
      setIsSearching(false);
    }
  };

  const applyLocalFilters = (hotelsData: Hotel[]) => {
    let filtered = hotelsData;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (h) =>
          h.hotelname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.district.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedDistrict !== 'all') {
      filtered = filtered.filter(h => h.district === selectedDistrict);
    }

    if (selectedSearchString !== 'all') {
      filtered = filtered.filter(h => {
        const hotelName = (h.hotelname || '').toLowerCase();
        const searchStr = (h.searchString || '').toLowerCase();
        const type = selectedSearchString.toLowerCase();
        return hotelName.includes(type) || searchStr.includes(type);
      });
    }

    let minPrice = 0;
    let maxPrice = 10000000;
    
    if (selectedPriceRange !== 'all') {
      const range = filterOptions.priceRanges.find(r => r.label === selectedPriceRange);
      if (range) {
        minPrice = range.min;
        maxPrice = range.max;
      }
    }
    
    filtered = filtered.filter(
      (h) => h.price >= minPrice && h.price <= maxPrice
    );

    console.log('Filter results:', filtered.length, 'hotels');

    setFilteredHotels(filtered);
    setMapHotels(getFeaturedHotelsForMap(filtered, 30));
  };

  return (
    <div className="h-screen flex flex-col">
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
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={isLoggingOut}>
                      <User className="w-4 h-4 mr-2" />
                      {user.email}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[10002]">
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
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      disabled={isLoggingOut}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className={`w-4 h-4 mr-2 ${isLoggingOut ? 'animate-spin' : ''}`} />
                      {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
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

      <div className="bg-white border-b p-4 shadow-sm z-30">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Tìm kiếm khách sạn, khu vực..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
      

      

      <div className="relative flex flex-row h-screen w-screen overflow-hidden bg-white">
      
      {/* ------------------------------------------------------ */}
      {/* 1. NÚT TOGGLE (Mobile Only)                            */}
      {/* ------------------------------------------------------ */}
      <button 
        onClick={() => setShowMobileList(!showMobileList)}
        className="lg:hidden absolute top-4 left-4 z-[9999] p-3 bg-white text-gray-700 rounded-full shadow-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
        aria-label="Toggle Hotel List"
      >
        {showMobileList ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* ------------------------------------------------------ */}
      {/* 2. OVERLAY (Lớp nền đen mờ khi mở menu trên mobile)    */}
      {/* ------------------------------------------------------ */}
      {showMobileList && (
        <div 
          className="lg:hidden fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm"
          onClick={() => setShowMobileList(false)}
        />
      )}

      {/* ------------------------------------------------------ */}
      {/* 3. HOTEL LIST CONTAINER (Sidebar)                      */}
      {/* ------------------------------------------------------ */}
      <div className={`
        absolute inset-y-0 left-0 z-[9995] w-[85%] sm:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
        ${showMobileList ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:w-1/2 lg:shadow-none lg:border-r lg:bg-gray-50 lg:block lg:z-auto
      `}>
        
        <div className="flex flex-col h-full">
          {/* Header text: "Tìm thấy..." */}
          {/* Thêm pt-16 trên mobile để tránh bị nút toggle che mất chữ */}
          <div className="px-4 pb-2 pt-20 lg:pt-4 text-sm text-gray-600">
            Tìm thấy <span className="font-bold">{filteredHotels.length}</span> khách sạn
          </div>

          {/* Vùng cuộn danh sách */}
          <ScrollArea className="flex-1 w-full h-full">
            {/* Wrapper thêm padding để list không bị dính sát lề */}
            <div className="px-4 pb-4 w-full"> 
              
              {isLoading ? (
                <div className="flex text-center py-12 justify-center">Đang tải...</div>
              ) : filteredHotels.length === 0 ? (
                <div className="flex text-center py-12 text-gray-500 justify-center">
                  Không tìm thấy khách sạn phù hợp
                </div>
              ) : (
                /* BẢNG HIỂN THỊ ITEM */
                /* border-spacing-y-3 tạo khoảng cách giữa các thẻ item */
                <div className="w-full px-4">
  <table className="w-full table-fixed"><tbody className="w-full">{filteredHotels.map((hotel) => (
        <tr key={hotel.id} className="w-full">
          {/* Thay vì dùng border-spacing ở table cha, 
            ta dùng padding-bottom (pb-4) ở thẻ td để tạo khoảng cách giữa các card 
          */}
          <td className="w-full p-0 pb-4 border-none block sm:table-cell"> 
            
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 h-12 px-6">
                  <Filter className="w-4 h-4" />
                  Bộ lọc
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Bộ lọc tìm kiếm</SheetTitle>
                  <SheetDescription>
                    Chọn các tiêu chí để lọc khách sạn phù hợp
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Loại nơi ở</label>
                    <Select value={selectedSearchString} onValueChange={setSelectedSearchString}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">Tất cả</SelectItem>
                        {filterOptions.searchStrings.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Quận/Huyện</label>
                    <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">Tất cả</SelectItem>
                        {filterOptions.districts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district.split(', Thành phố Hồ Chí Minh')[0]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Mức giá</label>
                    <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">Tất cả</SelectItem>
                        {filterOptions.priceRanges.map((range) => (
                          <SelectItem key={range.label} value={range.label}>{range.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={() => {
                        setShowFilters(false);
                        handleSearch();
                      }} 
                      className="w-full h-12"
                    >
                      Áp dụng bộ lọc
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              className="gap-2 h-12 px-6"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang tìm...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Tìm kiếm
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="relative flex flex-row h-screen w-screen overflow-hidden bg-white">
        <button 
          onClick={() => setShowMobileList(!showMobileList)}
          className="lg:hidden absolute top-4 left-4 z-[9999] p-3 bg-white text-gray-700 rounded-full shadow-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
          aria-label="Toggle Hotel List"
        >
          {showMobileList ? <X size={24} /> : <Menu size={24} />}
        </button>

        {showMobileList && (
          <div 
            className="lg:hidden fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileList(false)}
          />
        )}

        <div className={`
          absolute inset-y-0 left-0 z-[9995] w-[85%] sm:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
          ${showMobileList ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:w-1/2 lg:shadow-none lg:border-r lg:bg-gray-50 lg:block lg:z-auto
        `}>
          <div className="flex flex-col h-full">
            <div className="px-4 pb-2 pt-20 lg:pt-4 text-sm text-gray-600">
              {isSearching ? (
                <span>Đang tìm kiếm...</span>
              ) : (
                <>
                  Tìm thấy <span className="font-bold">{filteredHotels.length}</span> khách sạn
                  {searchQuery.trim() && <span className="ml-2 text-xs text-blue-600">với "{searchQuery}"</span>}
                </>
              )}
            </div>

            <ScrollArea className="flex-1 w-full h-full">
              <div className="px-4 pb-4 w-full"> 
                {isLoading ? (
                  <div className="flex text-center py-12 justify-center">Đang tải...</div>
                ) : isSearching ? (
                  <div className="flex text-center py-12 justify-center">
                    <div className="animate-pulse">Đang tìm kiếm khách sạn phù hợp...</div>
                  </div>
                ) : filteredHotels.length === 0 ? (
                  <div className="flex flex-col text-center py-12 text-gray-500 justify-center items-center">
                    <div className="text-5xl mb-4">🏨</div>
                    <div className="font-semibold mb-2">Không tìm thấy khách sạn phù hợp</div>
                    {searchQuery.trim() && (
                      <div className="text-sm text-gray-400">
                        Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full px-4">
                    <table className="w-full table-fixed">
                      <tbody className="w-full">
                        {filteredHotels.map((hotel) => (
                          <tr key={hotel.id} className="w-full">
                            <td className="w-full p-0 pb-4 border-none block sm:table-cell"> 
                              <div 
                                className={`
                                  w-full bg-white rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg border-2
                                  ${selectedHotel?.id === hotel.id ? 'border-primary shadow-lg' : 'border-transparent'}
                                `}
                                onClick={() => {
                                  navigate(`/properties/${hotel.id}`);
                                  setShowMobileList(false);
                                }}
                              >
                                <div className="flex w-full gap-4">
                                  <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 relative">
                                    <HotelImage src={hotel.imageUrl} alt={hotel.hotelname} />
                                  </div>

                                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                      <h3 className="font-semibold text-lg mb-1 truncate">
                                        {hotel.hotelname}
                                      </h3>
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="text-yellow-500 text-xs sm:text-sm">
                                          {'⭐'.repeat(Math.floor(hotel.star))}
                                        </div>
                                        {hotel.reviewsCount && (
                                          <span className="text-xs text-gray-500 truncate">
                                            ({hotel.reviewsCount} đánh giá)
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                                        <MapPin className="w-3 h-3 inline mr-1" />
                                        {hotel.district}
                                      </p>
                                    </div>
                                    
                                    <div className="flex items-end justify-between mt-1">
                                      <div>
                                        <div className="text-[10px] sm:text-xs text-gray-500">Giá từ</div>
                                        <div className="text-lg sm:text-2xl font-bold text-primary">
                                          VND {hotel.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                        </div>
                                      </div>
                                      <Button size="sm" className="bg-primary hover:bg-primary/90 shrink-0 ml-2">
                                        Xem
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="w-full h-full lg:w-1/2 relative bg-gray-100">
          <div className="h-full w-full relative">
            {mapHotels.length < filteredHotels.length && (
              <div className="hidden lg:block absolute top-6 left-6 right-6 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-3 text-sm max-w-md mx-auto pointer-events-none">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">
                    Hiển thị <strong>{mapHotels.length}</strong> trong <strong>{filteredHotels.length}</strong> khách sạn
                  </span>
                  <span className="text-xs text-gray-500 ml-2">(Đánh giá cao nhất)</span>
                </div>
              </div>
            )}
            
            <HotelMap
              hotels={mapHotels}
              onMarkerClick={(hotel) => {
                setSelectedHotel(hotel);
                setShowMobileList(true);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelSearch;
