import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Heart,
  Hotel as HotelIcon,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import HotelMap from "@/components/HotelMap";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Hotel {
  id: number;
  hotelname: string;
  address: string;
  street: string;
  district: string;
  city: string;
  lat: number;
  lon: number;
  categoryName: string;
  categories: string[];
  description1?: string;
  description2?: string;
  url_google?: string;
  website?: string;
  phone?: string;
  price: number;
  priceRange?: string;
  imageUrl?: string;
  star: number;
  rank?: number;
  totalScore?: number;
  reviewsCount?: number;
  amenities?: string[];
  reviews?: string[];
}

const formatPrice = (value: number): string => {
  if (!value || Number.isNaN(value)) return "0";
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const formatCurrency = (value?: number) => {
  if (!value || Number.isNaN(value)) return "—";
  return `VND ${formatPrice(value)}`;
};

const formatPriceRange = (priceRange?: string, minPrice?: number) => {
  if (!priceRange || !priceRange.includes('-')) {
    return minPrice ? `VND ${formatPrice(minPrice)}` : "—";
  }
  const parts = priceRange.split('-').map(p => p.trim());
  const min = parseFloat(parts[0]);
  const max = parseFloat(parts[1]);
  if (isNaN(min) || isNaN(max)) {
    return minPrice ? `VND ${formatPrice(minPrice)}` : "—";
  }
  return `VND ${formatPrice(min)} - ${formatPrice(max)}`;
};

const formatStarText = (star?: number) => {
  if (!star || Number.isNaN(star)) return "Chưa xếp hạng";
  return `${star.toFixed(1)} sao`;
};

const cleanAddress = (value?: string) => {
  if (!value) return "";
  let result = value.replace(/\s+/g, " ").trim();
  const headerIdx = result.toLowerCase().indexOf("hotelname,address");
  if (headerIdx !== -1) {
    result = result.slice(0, headerIdx).trim().replace(/[,\s]+$/, "");
  }
  return result;
};

const InfoBadge = ({ label }: { label: string }) => (
  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
    {label}
  </span>
);

const AmenityTag = ({ text }: { text: string }) => (
  <span className="inline-flex items-center rounded-md bg-muted px-3 py-2 text-sm text-foreground">
    {text}
  </span>
);

const ContentSkeleton = () => (
  <div className="container mx-auto px-4 py-8 space-y-6">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <Skeleton className="h-72 w-full rounded-2xl" />
    <div className="grid lg:grid-cols-3 gap-6">
      <Skeleton className="h-96 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl lg:col-span-2" />
    </div>
  </div>
);

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [routeData, setRouteData] = useState<{
    coordinates: [number, number][];
    distance: number;
    duration: number;
    steps: Array<{
      instruction: string;
      distance: number;
      type: string;
    }>;
  } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchHotel = async () => {
      if (!id) {
        setError("Thiếu mã khách sạn");
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`http://localhost:5000/api/properties/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Không thể tải thông tin khách sạn");
        }

        setHotel(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotel();
  }, [id]);

  // Check if hotel is in wishlist
  useEffect(() => {
    const checkWishlist = async () => {
      if (!id || !session) return;
      
      try {
        const response = await fetch(`http://localhost:5000/api/wishlist/check/${id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        const data = await response.json();
        setIsInWishlist(data.inWishlist);
      } catch (err) {
        console.error('Error checking wishlist:', err);
      }
    };

    checkWishlist();
  }, [id, session]);

  const getManeuverInstruction = (type: string, modifier?: string, name?: string) => {
    const distance = name ? ` vào ${name}` : '';
    
    if (type === 'depart') return `Bắt đầu ${distance}`;
    if (type === 'arrive') return `Đến đích`;
    if (type === 'turn') {
      if (modifier === 'left') return `Rẽ trái${distance}`;
      if (modifier === 'right') return `Rẽ phải${distance}`;
      if (modifier === 'slight left') return `Rẽ nhẹ sang trái${distance}`;
      if (modifier === 'slight right') return `Rẽ nhẹ sang phải${distance}`;
      if (modifier === 'sharp left') return `Rẽ gập bên trái${distance}`;
      if (modifier === 'sharp right') return `Rẽ gập bên phải${distance}`;
    }
    if (type === 'continue') return `Tiếp tục đi thẳng${distance}`;
    if (type === 'merge') return `Nhập làn${distance}`;
    if (type === 'on ramp') return `Vào đường cao tốc${distance}`;
    if (type === 'off ramp') return `Xuống đường cao tốc${distance}`;
    if (type === 'fork') {
      if (modifier === 'left') return `Giữ làn trái tại ngã ba${distance}`;
      if (modifier === 'right') return `Giữ làn phải tại ngã ba${distance}`;
    }
    if (type === 'roundabout') return `Vào bùng biên${distance}`;
    if (type === 'rotary') return `Vào vòng xoay${distance}`;
    if (type === 'new name') return `Tiếp tục${distance}`;
    return `Tiếp tục${distance}`;
  };

  const fetchRoute = async (from: [number, number], to: [number, number]) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => 
          [coord[1], coord[0]] as [number, number]
        );
        
        // Parse steps for turn-by-turn directions
        const steps: Array<{ instruction: string; distance: number; type: string }> = [];
        if (route.legs && route.legs.length > 0) {
          route.legs.forEach((leg: any) => {
            if (leg.steps) {
              leg.steps.forEach((step: any) => {
                const maneuver = step.maneuver;
                const instruction = getManeuverInstruction(
                  maneuver.type,
                  maneuver.modifier,
                  step.name
                );
                steps.push({
                  instruction,
                  distance: step.distance,
                  type: maneuver.type
                });
              });
            }
          });
        }
        
        return {
          coordinates,
          distance: route.distance / 1000, // Convert to km
          duration: route.duration / 60, // Convert to minutes
          steps,
        };
      }
      return null;
    } catch (error) {
      console.error('OSRM error:', error);
      return null;
    }
  };

  const toggleDirections = async () => {
    if (!showDirections) {
      setLoadingLocation(true);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userPos: [number, number] = [
              position.coords.latitude,
              position.coords.longitude
            ];
            setUserLocation(userPos);
            
            if (hotel) {
              const route = await fetchRoute(userPos, [hotel.lat, hotel.lon]);
              if (route) {
                setRouteData(route);
                setShowDirections(true);
                toast({
                  title: "Đã tìm thấy đường đi",
                  description: `Khoảng cách: ${route.distance.toFixed(2)} km - Thời gian: ${Math.round(route.duration)} phút`,
                });
              } else {
                toast({
                  title: "Không tìm thấy đường đi",
                  description: "Không thể tính toán lộ trình",
                  variant: "destructive",
                });
              }
            }
            setLoadingLocation(false);
          },
          (error) => {
            setLoadingLocation(false);
            toast({
              title: "Không thể lấy vị trí",
              description: "Vui lòng bật quyền truy cập vị trí trong trình duyệt",
              variant: "destructive",
            });
            console.error('Geolocation error:', error);
          }
        );
      } else {
        setLoadingLocation(false);
        toast({
          title: "Không hỗ trợ",
          description: "Trình duyệt của bạn không hỗ trợ định vị",
          variant: "destructive",
        });
      }
    } else {
      setShowDirections(false);
      setUserLocation(null);
      setRouteData(null);
    }
  };

  const toggleWishlist = async () => {
    if (!user || !session) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để lưu khách sạn yêu thích",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    if (!hotel) return;

    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(`http://localhost:5000/api/wishlist/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to remove from wishlist');

        setIsInWishlist(false);
        toast({
          title: "Đã xóa khỏi yêu thích",
          description: `${hotel.hotelname} đã được xóa khỏi danh sách yêu thích`,
        });
      } else {
        // Add to wishlist
        const response = await fetch('http://localhost:5000/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            hotel_id: id,
            hotel_name: hotel.hotelname,
            hotel_image: hotel.imageUrl,
            hotel_price: hotel.price,
            hotel_district: hotel.district,
            hotel_star: hotel.star,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 409) {
            setIsInWishlist(true);
            return;
          }
          throw new Error(data.error || 'Failed to add to wishlist');
        }

        setIsInWishlist(true);
        toast({
          title: "Đã thêm vào yêu thích",
          description: `${hotel.hotelname} đã được lưu vào danh sách yêu thích`,
        });
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      toast({
        title: "Có lỗi xảy ra",
        description: err instanceof Error ? err.message : "Vui lòng thử lại sau",
        variant: "destructive",
      });
    } finally {
      setWishlistLoading(false);
    }
  };

  const locationLabel = useMemo(() => {
    if (!hotel) return "";
    const parts = [hotel.street || hotel.district, hotel.city].filter(Boolean);
    return parts.join(", ");
  }, [hotel]);

  const displayAddress = useMemo(() => cleanAddress(hotel?.address || ""), [hotel]);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <main className="pt-20">
          <ContentSkeleton />
        </main>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-12 space-y-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-semibold mb-3">Không tìm thấy khách sạn</h2>
              <p className="text-muted-foreground mb-6">
                {error || "Vui lòng thử lại hoặc chọn khách sạn khác."}
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => navigate("/search")}>Quay về trang tìm kiếm</Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Thử tải lại
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const {
    hotelname,
    imageUrl,
    star,
    totalScore,
    reviewsCount,
    price,
    categoryName,
    categories,
    description1,
    description2,
    url_google,
    website,
    phone,
    amenities = [],
    reviews = [],
    rank,
    district,
    lat,
    lon,
  } = hotel;

  const hasCoordinates = lat !== 0 && lon !== 0;

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-8 pt-20">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <div className="flex items-center gap-2">
            <InfoBadge label={categoryName || "Khách sạn"} />
            {rank ? <InfoBadge label={`Hạng #${rank}`} /> : null}
            <InfoBadge label={district || "Hồ Chí Minh"} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="overflow-hidden">
            <div className="relative h-[360px] bg-muted">
              {imageUrl && !imageError ? (
                <img
                  src={imageUrl}
                  alt={hotelname}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <HotelIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p>{imageUrl ? "Không thể tải hình ảnh" : "Không có hình ảnh"}</p>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 text-white">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <MapPin className="h-4 w-4" />
                    <span>{locationLabel || "Hồ Chí Minh"}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <h1 className="text-2xl md:text-3xl font-bold">{hotelname}</h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleWishlist}
                      disabled={wishlistLoading}
                      className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                    >
                      <Heart
                        className={cn(
                          "h-5 w-5",
                          isInWishlist ? "fill-red-500 text-red-500" : "text-white"
                        )}
                      />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
                    <Star className="h-4 w-4 text-yellow-300" />
                    <span className="font-semibold">{formatStarText(star)}</span>
                  </div>
                  {totalScore ? (
                    <div className="rounded-full bg-white/10 px-3 py-2 text-sm">
                      Điểm đánh giá: <span className="font-semibold">{totalScore.toFixed(1)}</span>
                      {reviewsCount ? ` (${reviewsCount} lượt)` : ""}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4 self-start sticky top-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Giá mỗi đêm từ</p>
                <p className="text-3xl font-bold text-primary">{formatPriceRange(hotel?.priceRange, price)}</p>
              </div>
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Hỗ trợ hoàn hủy linh hoạt</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Ưu tiên lựa chọn ở {district}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              {website ? (
                <Button asChild className="w-full">
                  <a href={website} target="_blank" rel="noreferrer">
                    <Globe className="h-4 w-4 mr-2" />
                    Website khách sạn
                  </a>
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  Website khách sạn
                </Button>
              )}
              <div className="grid grid-cols-2 gap-3">
                {phone ? (
                  <Button asChild variant="outline" className="w-full">
                    <a href={`tel:${phone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Gọi ngay
                    </a>
                  </Button>
                ) : null}
                {url_google ? (
                  <Button asChild variant="outline" className="w-full">
                    <a href={url_google} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Google Maps
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tổng quan</h2>
              <div className="flex flex-wrap gap-2">
                {categories?.map((cat) => (
                  <InfoBadge key={cat} label={cat} />
                ))}
              </div>
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
              <p>{description1 || "Chưa có mô tả ngắn."}</p>
              {description2 ? <p className="mt-3">{description2}</p> : null}
            </div>
          </Card>

          <Card className="p-6 space-y-3">
            <h3 className="text-lg font-semibold">Điểm nổi bật</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Hạng sao</p>
                <p className="font-semibold">{formatStarText(star)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Điểm đánh giá</p>
                <p className="font-semibold">
                  {totalScore ? `${totalScore.toFixed(1)} / 5` : "Chưa có"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Số lượt đánh giá</p>
                <p className="font-semibold">{reviewsCount || "—"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Mức giá</p>
                <p className="font-semibold">{formatPriceRange(hotel?.priceRange, price)}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Tiện ích & dịch vụ</h3>
            <p className="text-sm text-muted-foreground">
              {amenities.length} tiện ích đã cập nhật
            </p>
          </div>
          {amenities.length ? (
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <AmenityTag key={amenity} text={amenity} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Chưa có thông tin tiện ích cho khách sạn này.
            </p>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vị trí</h3>
              {url_google ? (
                <a
                  href={url_google}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-sm flex items-center gap-1 hover:underline"
                >
                  Mở bản đồ
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {displayAddress || "Chưa có địa chỉ chi tiết"}
            </p>
            {hasCoordinates ? (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Button
                    onClick={toggleDirections}
                    disabled={loadingLocation}
                    variant={showDirections ? "default" : "outline"}
                    className="flex items-center gap-2"
                  >
                    <Navigation className={`h-4 w-4 ${showDirections ? 'animate-pulse' : ''}`} />
                    {loadingLocation ? 'Đang tìm đường...' : showDirections ? 'Tắt chỉ đường' : 'Chỉ đường từ vị trí hiện tại'}
                  </Button>
                  {routeData && showDirections && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 font-medium text-primary">
                        <MapPin className="h-4 w-4" />
                        {routeData.distance.toFixed(2)} km
                      </div>
                      <div className="text-muted-foreground">
                        ~{Math.round(routeData.duration)} phút
                      </div>
                    </div>
                  )}
                </div>
                <div className="h-72 overflow-hidden rounded-xl border">
                  <HotelMap 
                    hotels={[hotel]} 
                    center={showDirections && userLocation ? userLocation : [hotel.lat, hotel.lon]} 
                    zoom={showDirections ? 13 : 15}
                    userLocation={showDirections ? userLocation : undefined}
                    routeCoordinates={showDirections && routeData ? routeData.coordinates : undefined}
                  />
                </div>
                {showDirections && userLocation && routeData && (
                  <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          A
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Vị trí hiện tại của bạn</p>
                          <p className="text-sm text-muted-foreground">{userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pl-4">
                        <div className="w-0.5 h-12 bg-gradient-to-b from-blue-500 to-green-500"></div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-foreground">{routeData.distance.toFixed(2)} km</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Thời gian dự kiến: ~{Math.round(routeData.duration)} phút</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          B
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{hotel.hotelname}</p>
                          <p className="text-sm text-muted-foreground">{displayAddress}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 space-y-3">
                        <h4 className="font-semibold text-sm text-foreground">Chỉ dẫn đi đường:</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {routeData.steps.map((step, index) => (
                            <div key={index} className="flex items-start gap-3 text-sm">
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold flex-shrink-0 text-xs">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-foreground font-medium">{step.instruction}</p>
                                {step.distance > 0 && (
                                  <p className="text-muted-foreground text-xs mt-0.5">
                                    {step.distance >= 1000 
                                      ? `${(step.distance / 1000).toFixed(1)} km`
                                      : `${Math.round(step.distance)} m`
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {url_google && (
                          <a
                            href={url_google}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors mt-3"
                          >
                            Mở Google Maps
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                Chưa có tọa độ để hiển thị bản đồ.
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Đánh giá gần đây</h3>
              <InfoBadge label={`${reviews.length || 0} nhận xét`} />
            </div>
            {reviews.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {reviews.slice(0, 6).map((review, idx) => {
                  const isExpanded = expandedReviews[idx];
                  const isLong = review.length > 220;
                  return (
                    <div key={`${review}-${idx}`} className="rounded-lg border p-4 space-y-2 bg-card/50">
                      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span>Khách đã lưu trú</span>
                        </div>
                        {isLong ? (
                          <button
                            className="text-primary text-xs font-medium hover:underline"
                            onClick={() =>
                              setExpandedReviews((prev) => ({ ...prev, [idx]: !prev[idx] }))
                            }
                          >
                            {isExpanded ? "Thu gọn" : "Xem thêm"}
                          </button>
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          "text-foreground leading-relaxed text-sm",
                          !isExpanded && "line-clamp-5"
                        )}
                      >
                        {review}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Chưa có đánh giá nào được ghi nhận.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
