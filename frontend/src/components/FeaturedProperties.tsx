import PropertyCard from "./PropertyCard";
import hotel1 from "@/assets/hotel-1.jpg";
import hotel2 from "@/assets/hotel-2.jpg";
import hotel3 from "@/assets/hotel-3.jpg";
import hotel4 from "@/assets/hotel-4.jpg";
import { useNavigate } from "react-router-dom";

const FeaturedProperties = () => {
  const navigate = useNavigate();

  const properties = [
    {
      id: "1",
      image: hotel1,
      name: "Khách Sạn Seaside Luxury",
      location: "Đà Nẵng, Việt Nam",
      rating: 4.8,
      reviews: 1234,
      price: 1200000,
      originalPrice: 1800000,
      amenities: ["wifi", "breakfast", "parking"],
    },
    {
      id: "2",
      image: hotel2,
      name: "Homestay Green Valley",
      location: "Đà Lạt, Lâm Đồng",
      rating: 4.9,
      reviews: 892,
      price: 500000,
      originalPrice: 750000,
      amenities: ["wifi", "breakfast"],
    },
    {
      id: "3",
      image: hotel3,
      name: "Resort Paradise Beach",
      location: "Phú Quốc, Kiên Giang",
      rating: 4.7,
      reviews: 2156,
      price: 2500000,
      originalPrice: 3500000,
      amenities: ["wifi", "breakfast", "parking"],
    },
    {
      id: "4",
      image: hotel4,
      name: "Boutique Hotel Central",
      location: "Hà Nội, Việt Nam",
      rating: 4.6,
      reviews: 678,
      price: 800000,
      amenities: ["wifi", "parking"],
    },
    {
      id: "5",
      image: hotel1,
      name: "Ocean View Resort",
      location: "Nha Trang, Khánh Hòa",
      rating: 4.9,
      reviews: 1567,
      price: 1800000,
      originalPrice: 2400000,
      amenities: ["wifi", "breakfast", "parking"],
    },
    {
      id: "6",
      image: hotel2,
      name: "Mountain Retreat",
      location: "Sapa, Lào Cai",
      rating: 4.8,
      reviews: 945,
      price: 600000,
      amenities: ["wifi", "breakfast"],
    },
  ];

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <div
              key={property.id}
              onClick={() => navigate(`/properties/${property.id}`)}
              className="cursor-pointer"
            >
              <PropertyCard {...property} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
