import { Search, MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SearchBar = () => {
  return (
    <div className="bg-card rounded-2xl shadow-large p-4 md:p-6 w-full max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Destination */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-input hover:border-primary transition-colors">
          <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="text-xs text-muted-foreground block mb-1">Điểm đến</label>
            <Input
              type="text"
              placeholder="Thành phố, địa điểm..."
              className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
            />
          </div>
        </div>

        {/* Check-in Date */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-input hover:border-primary transition-colors">
          <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="text-xs text-muted-foreground block mb-1">Ngày nhận phòng</label>
            <Input
              type="date"
              className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
            />
          </div>
        </div>

        {/* Check-out Date */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-input hover:border-primary transition-colors">
          <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="text-xs text-muted-foreground block mb-1">Ngày trả phòng</label>
            <Input
              type="date"
              className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
            />
          </div>
        </div>

        {/* Guests */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-input hover:border-primary transition-colors md:col-span-1">
          <Users className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="text-xs text-muted-foreground block mb-1">Số khách</label>
            <Input
              type="number"
              placeholder="2"
              min="1"
              className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
            />
          </div>
        </div>
      </div>

      <Button 
        className="w-full mt-4 bg-primary hover:bg-primary-hover text-primary-foreground h-12 text-base font-semibold shadow-medium"
      >
        <Search className="w-5 h-5 mr-2" />
        Tìm kiếm
      </Button>
    </div>
  );
};

export default SearchBar;
