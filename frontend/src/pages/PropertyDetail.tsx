import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Hotel as HotelIcon,
  MapPin,
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
  imageUrl?: string;
  star: number;
  rank?: number;
  totalScore?: number;
  reviewsCount?: number;
  amenities?: string[];
  reviews?: string[];
}

const formatCurrency = (value?: number) => {
  if (!value || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("vi-VN")} ₫`;
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
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});

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
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt={hotelname}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Hide broken image and show fallback
                      e.currentTarget.classList.add('hidden');
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden h-full w-full">
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <HotelIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <p>Không thể tải hình ảnh</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <HotelIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p>Không có hình ảnh</p>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 text-white">
                <div>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <MapPin className="h-4 w-4" />
                    <span>{locationLabel || "Hồ Chí Minh"}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold mt-1">{hotelname}</h1>
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
                <p className="text-3xl font-bold text-primary">{formatCurrency(price)}</p>
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
                <p className="font-semibold">{formatCurrency(price)}</p>
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
              <div className="h-72 overflow-hidden rounded-xl border">
                <HotelMap hotels={[hotel]} center={[hotel.lat, hotel.lon]} zoom={15} />
              </div>
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
