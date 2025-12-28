import { useState, useEffect } from 'react';
import { Map, MapPin, Star, DollarSign, Filter, Search, Hotel as HotelIcon, User, LogOut, Navigation, LayoutDashboard, Heart } from 'lucide-react';
import { Menu, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  amenities?: string[];
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

const HotelImage = ({ src, alt }: { src?: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
  const [isSearching, setIsSearching] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedSearchString, setSelectedSearchString] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showMobileList, setShowMobileList] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [useLocationFilter, setUseLocationFilter] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const maxDistance = 3; // Fixed at 3km
  const [gettingLocation, setGettingLocation] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

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
    totalHotels: 3000,
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
      toast({
        title: "Đăng xuất thành công",
        description: "Hẹn gặp lại bạn!",
      });
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Lỗi đăng xuất",
        description: "Không thể đăng xuất. Vui lòng thử lại.",
        variant: "destructive",
      });
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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const toggleLocationFilter = () => {
    if (useLocationFilter) {
      // Turn off location filter
      setUseLocationFilter(false);
      setUserLocation(null);
      applyLocalFilters(hotels);
    } else {
      // Turn on location filter - get user location
      setGettingLocation(true);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos: [number, number] = [
              position.coords.latitude,
              position.coords.longitude
            ];
            setUserLocation(userPos);
            setUseLocationFilter(true);
            setGettingLocation(false);
          },
          (error) => {
            console.error('Geolocation error:', error);
            alert('Không thể lấy vị trí của bạn. Vui lòng kiểm tra quyền truy cập.');
            setGettingLocation(false);
          }
        );
      } else {
        alert('Trình duyệt của bạn không hỗ trợ định vị');
        setGettingLocation(false);
      }
    }
  };

  const toggleMapVisibility = () => {
    setShowMap((prev) => {
      const next = !prev;
      if (!next) setShowMobileList(false);
      return next;
    });
  };

  // Auto-apply filter when location changes
  useEffect(() => {
    if (useLocationFilter && userLocation && hotels.length > 0) {
      applyLocalFilters(hotels);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useLocationFilter, userLocation]);

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

    // Filter by distance from user location
    if (useLocationFilter && userLocation) {
      filtered = filtered.filter((h) => {
        const distance = calculateDistance(
          userLocation[0], userLocation[1],
          h.lat, h.lon
        );
        return distance <= maxDistance;
      });
    }

    console.log('Filter results:', filtered.length, 'hotels');

    setFilteredHotels(filtered);
    setMapHotels(getFeaturedHotelsForMap(filtered, 30));
  };

  const listPanelClass = showMap
    ? `
      absolute inset-y-0 left-0 z-[9995] w-[85%] sm:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
      ${showMobileList ? 'translate-x-0' : '-translate-x-full'}
      lg:relative lg:translate-x-0 lg:w-1/2 lg:shadow-none lg:border-r lg:bg-gray-50 lg:block lg:z-auto
    `
    : 'relative w-full bg-gray-50';

  return (
    <div className="h-screen flex flex-col">
      <nav className="bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-400 backdrop-blur-md shadow-2xl border-b-4 border-white/20 z-20">
        <div className="px-6 py-5">
          <div className="flex items-center relative">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl bg-white/90 flex items-center justify-center shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <HotelIcon className="w-7 h-7 text-sky-600" />
              </div>
              <span className="text-2xl font-bold text-white drop-shadow-md">3T2M1Stay</span>
            </Link>

            <div className="flex items-center gap-4 absolute left-1/2 -translate-x-1/2">
              <Link to="/" className="px-5 py-2.5 rounded-lg text-white font-semibold text-base border border-white/25 hover:border-white/50 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm shadow-md hover:shadow-lg hover:scale-105">
                Trang chủ
              </Link>
              <Link to="/search" className="px-5 py-2.5 rounded-lg text-white font-semibold text-base border border-white/25 hover:border-white/50 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm shadow-md hover:shadow-lg hover:scale-105">
                Tìm khách sạn
              </Link>
              <Link to="/smart-search" className="px-5 py-2.5 rounded-lg text-white font-semibold text-base border border-white/25 hover:border-white/50 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2">
                <span>✨</span> Tìm kiếm Thông Minh
              </Link>
              <Link to="/about" className="px-5 py-2.5 rounded-lg text-white font-semibold text-base border border-white/25 hover:border-white/50 hover:bg-white/10 transition-all duration-200 backdrop-blur-sm shadow-md hover:shadow-lg hover:scale-105">
                Về chúng tôi
              </Link>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : user ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex items-center gap-2 hover:bg-accent focus:outline-none"
                      disabled={isLoggingOut}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="max-w-[150px] truncate">
                        {user.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 z-[10002]">
                    <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-[200px] pr-3">
                      <div className="space-y-1 pr-1">
                        <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer focus:bg-accent">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer focus:bg-accent">
                          <User className="w-4 h-4 mr-2" />
                          Hồ sơ cá nhân
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/bookings')} className="cursor-pointer focus:bg-accent">
                          <HotelIcon className="w-4 h-4 mr-2" />
                          Đặt phòng của tôi
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/wishlist')} className="cursor-pointer focus:bg-accent">
                          <Heart className="w-4 h-4 mr-2" />
                          Khách sạn yêu thích
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/search')} className="cursor-pointer focus:bg-accent">
                          <HotelIcon className="w-4 h-4 mr-2" />
                          Lịch sử tìm kiếm
                        </DropdownMenuItem>
                      </div>
                    </ScrollArea>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      disabled={isLoggingOut}
                      className="text-red-600 cursor-pointer focus:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className={`w-4 h-4 mr-2 ${isLoggingOut ? 'animate-spin' : ''}`} />
                      {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="font-semibold text-white hover:bg-white/20 hover:text-white transition-all duration-200 border border-white/30">
                      <User className="w-4 h-4 mr-2" />
                      Đăng nhập
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="bg-white text-sky-600 hover:bg-white/90 font-semibold shadow-md hover:shadow-lg transition-all duration-200">
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

            <div className="flex items-center gap-2 h-12 px-4 border rounded-lg bg-white">
              <Navigation className="w-4 h-4 text-gray-600" />
              <span className="hidden sm:inline text-sm font-medium text-gray-700">Vị trí</span>
              <button
                onClick={toggleLocationFilter}
                disabled={gettingLocation}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2
                  ${gettingLocation ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${useLocationFilter ? 'bg-sky-500' : 'bg-gray-300'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg
                    ${useLocationFilter ? 'translate-x-6' : 'translate-x-1'}
                  `}
                >
                  {gettingLocation && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 border border-sky-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 h-12 px-4 border rounded-lg bg-white">
              <Map className="w-4 h-4 text-gray-600" />
              <span className="hidden sm:inline text-sm font-medium text-gray-700">Bản đồ</span>
              <button
                onClick={toggleMapVisibility}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2
                  ${showMap ? 'bg-sky-500' : 'bg-gray-300'}
                `}
                aria-pressed={showMap}
                aria-label={showMap ? 'Tắt bản đồ' : 'Bật bản đồ'}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg
                    ${showMap ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              className="gap-2 h-12 px-4 sm:px-6"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Đang tìm...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Tìm kiếm</span>
                  <span className="sm:hidden">Searching</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="relative flex flex-row h-screen w-screen overflow-hidden bg-white">
        {showMap && (
          <button 
            onClick={() => setShowMobileList(!showMobileList)}
            className="lg:hidden absolute top-4 left-4 z-[9999] p-3 bg-white text-gray-700 rounded-full shadow-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
            aria-label="Toggle Hotel List"
          >
            {showMobileList ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        {showMap && showMobileList && (
          <div 
            className="lg:hidden fixed inset-0 z-[9990] bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileList(false)}
          />
        )}

        <div className={listPanelClass}>
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
                        {filteredHotels.map((hotel) => {
                          const amenities = Array.isArray(hotel.amenities)
                            ? hotel.amenities.map((amenity) => String(amenity).trim()).filter(Boolean)
                            : [];
                          const visibleAmenities = amenities.slice(0, 3);
                          const extraAmenities = amenities.length - visibleAmenities.length;

                          return (
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
                                        {visibleAmenities.length ? (
                                          <div className="flex flex-wrap gap-1.5 mb-2">
                                            {visibleAmenities.map((amenity, idx) => (
                                              <span
                                                key={`${hotel.id}-amenity-${idx}`}
                                                className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-gray-100 text-gray-700 border border-gray-200 truncate"
                                              >
                                                {amenity}
                                              </span>
                                            ))}
                                            {extraAmenities > 0 && (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-gray-50 text-gray-500 border border-gray-200">
                                                +{extraAmenities}
                                              </span>
                                            )}
                                          </div>
                                        ) : null}
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {showMap && (
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
                userLocation={useLocationFilter ? userLocation : null}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelSearch;
