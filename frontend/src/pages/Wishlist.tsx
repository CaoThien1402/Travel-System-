import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Trash2, Hotel as HotelIcon, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WishlistItem {
  id: string;
  hotel_id: string;
  hotel_name: string;
  hotel_image?: string;
  hotel_price?: number;
  hotel_district?: string;
  hotel_star?: number;
  created_at: string;
}

const formatPrice = (value?: number): string => {
  if (!value || Number.isNaN(value)) return "Chưa có giá";
  return `VND ${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

const WishlistSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <Card key={i} className="overflow-hidden">
        <Skeleton className="h-48 w-full" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    ))}
  </div>
);

export default function Wishlist() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchWishlist();
  }, [user, session]);

  const fetchWishlist = async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/api/wishlist', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wishlist');
      }

      const data = await response.json();
      setWishlistItems(data.wishlists || []);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      toast({
        title: "Không thể tải danh sách",
        description: "Vui lòng thử lại sau",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWishlist = async (hotelId: string, hotelName: string) => {
    if (!session) return;

    setRemovingIds(prev => new Set(prev).add(hotelId));

    try {
      const response = await fetch(`http://localhost:5000/api/wishlist/${hotelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove from wishlist');
      }

      setWishlistItems(prev => prev.filter(item => item.hotel_id !== hotelId));
      toast({
        title: "Đã xóa khỏi yêu thích",
        description: `${hotelName} đã được xóa khỏi danh sách yêu thích`,
      });
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      toast({
        title: "Có lỗi xảy ra",
        description: "Không thể xóa khỏi danh sách yêu thích",
        variant: "destructive",
      });
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(hotelId);
        return newSet;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-8">
              <Heart className="h-8 w-8 text-primary fill-primary" />
              <h1 className="text-3xl font-bold">Khách sạn yêu thích</h1>
            </div>
            <WishlistSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="h-8 w-8 text-primary fill-primary" />
            <h1 className="text-3xl font-bold">Khách sạn yêu thích</h1>
            <span className="text-muted-foreground">({wishlistItems.length})</span>
          </div>

          {wishlistItems.length === 0 ? (
            <Card className="p-12 text-center">
              <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-2xl font-semibold mb-2">Chưa có khách sạn yêu thích</h2>
              <p className="text-muted-foreground mb-6">
                Bạn chưa lưu khách sạn nào vào danh sách yêu thích
              </p>
              <Button onClick={() => navigate('/search')}>
                Khám phá khách sạn
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistItems.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <div
                    onClick={() => navigate(`/properties/${item.hotel_id}`)}
                    className="relative h-48 bg-muted"
                  >
                    {item.hotel_image ? (
                      <img
                        src={item.hotel_image}
                        alt={item.hotel_name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <HotelIcon className="w-12 h-12 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWishlist(item.hotel_id, item.hotel_name);
                        }}
                        disabled={removingIds.has(item.hotel_id)}
                        className="rounded-full bg-white/90 hover:bg-white shadow-md"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div
                    onClick={() => navigate(`/properties/${item.hotel_id}`)}
                    className="p-4 space-y-2"
                  >
                    <h3 className="font-semibold text-lg line-clamp-1">
                      {item.hotel_name}
                    </h3>
                    {item.hotel_district && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{item.hotel_district}</span>
                      </div>
                    )}
                    {item.hotel_star && (
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span>{item.hotel_star} sao</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(item.hotel_price)}
                      </p>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/properties/${item.hotel_id}`);
                        }}
                      >
                        Xem chi tiết
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
