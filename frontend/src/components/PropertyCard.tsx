import { Star, MapPin, Wifi, Coffee, Car, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertyCardProps {
  image: string;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  price: number;
  originalPrice?: number;
  amenities?: string[];
}

const PropertyCard = ({
  image,
  name,
  location,
  rating,
  reviews,
  price,
  originalPrice,
  amenities = [],
}: PropertyCardProps) => {
  const amenityIcons: { [key: string]: LucideIcon } = {
    wifi: Wifi,
    breakfast: Coffee,
    parking: Car,
  };

  return (
    <div className="group bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-large transition-all duration-300 cursor-pointer">
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {originalPrice && (
          <div className="absolute top-3 right-3 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm font-semibold shadow-medium">
            -{Math.round(((originalPrice - price) / originalPrice) * 100)}%
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg flex-shrink-0">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="text-sm font-semibold text-primary">{rating}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">{location}</span>
        </div>

        {amenities.length > 0 && (
          <div className="flex gap-2 mb-3">
            {amenities.slice(0, 3).map((amenity, index) => {
              const Icon = amenityIcons[amenity];
              return Icon ? (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-accent text-accent-foreground px-2 py-1 rounded text-xs"
                >
                  <Icon className="w-3 h-3" />
                </div>
              ) : null;
            })}
          </div>
        )}

        <div className="text-sm text-muted-foreground mb-3">
          {reviews.toLocaleString()} đánh giá
        </div>

        <div className="flex items-end justify-between pt-3 border-t border-border">
          <div>
            {originalPrice && (
              <div className="text-sm text-muted-foreground line-through">
                {originalPrice.toLocaleString()}₫
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">
                {price.toLocaleString()}₫
              </span>
              <span className="text-sm text-muted-foreground">/đêm</span>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
            Xem phòng
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
