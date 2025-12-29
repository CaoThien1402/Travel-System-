import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropertyCard from "./PropertyCard";

interface Hotel {
  id: number;
  hotelname: string;
  district: string;
  price: number;
  star: number;
  totalScore?: number;
  reviewsCount?: number;
  imageUrl?: string;
}

const FeaturedProperties = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Fetch all hotels with noPagination=true to get all data for featured selection
        const res = await fetch('http://localhost:5000/api/properties?noPagination=true');
        if (!res.ok) throw new Error('Failed to load properties');
        const allHotels = (await res.json()) as Hotel[];

        // Filter and sort: 5-star hotels, high price, many reviews
        const featured = allHotels
          .filter(hotel => hotel.star >= 4.5) // 4.5 sao trở lên (gần 5 sao)
          .sort((a, b) => {
            // Ưu tiên: số đánh giá cao → giá cao → sao cao
            const scoreA = (a.reviewsCount || 0) * 100 + (a.price || 0) / 1000 + (a.star || 0);
            const scoreB = (b.reviewsCount || 0) * 100 + (b.price || 0) / 1000 + (b.star || 0);
            return scoreB - scoreA;
          })
          .slice(0, 6); // Lấy 6 khách sạn top

        setProperties(featured);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi khi tải khách sạn nổi bật"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  const featuredCards = useMemo(() => {
    return properties.map((hotel) => ({
      id: hotel.id,
      image: hotel.imageUrl,
      name: hotel.hotelname,
      location: hotel.district || "Hồ Chí Minh",
      rating: hotel.totalScore || hotel.star || 0,
      reviews: hotel.reviewsCount || 0,
      price: hotel.price || 0,
      amenities: ["wifi", "parking", "breakfast"], // simple badges for visual consistency
    }));
  }, [properties]);

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Khách Sạn Nổi Bật
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Những lựa chọn được yêu thích nhất với đánh giá cao từ khách hàng
          </p>
        </div>

        {error ? (
          <p className="text-center text-muted-foreground">{error}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-muted animate-pulse h-[320px]"
                  />
                ))
              : featuredCards.map((property) => (
                  <div
                    key={property.id}
                    onClick={() => navigate(`/properties/${property.id}`)}
                    className="cursor-pointer"
                  >
                    <PropertyCard {...property} />
                  </div>
                ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProperties;
