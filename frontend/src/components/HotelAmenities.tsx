import { useMemo } from 'react';
import { 
  Wifi, 
  Snowflake, 
  User, 
  Home, 
  Tv, 
  Wind, 
  WashingMachine, 
  Bath, 
  Utensils, 
  Coffee, 
  CookingPot,
  Refrigerator,
  Monitor,
  Laptop,
  Trees,
  Sun,
  Languages,
  CheckCircle2,
  ParkingCircle
} from 'lucide-react';

interface HotelAmenitiesProps {
  amenities: string[];
  hotelName: string;
}

// Hàm random để thêm một chút sự khác biệt giữa các khách sạn
const getRandomSubset = <T,>(arr: T[], min: number, max: number): T[] => {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  return arr.sort(() => Math.random() - 0.5).slice(0, count);
};

export default function HotelAmenities({ amenities, hotelName }: HotelAmenitiesProps) {
  const amenitiesData = useMemo(() => {
    // Tiện nghi được ưa chuộng nhất
    const topAmenities = [
      { icon: <Wifi className="w-5 h-5" />, label: 'WiFi miễn phí' },
      { icon: <Snowflake className="w-5 h-5" />, label: 'Điều hòa nhiệt độ' }
    ];

    // Các tiện nghi cơ bản - random một số cái
    const basicAmenities = [
      'Phòng tắm riêng',
      'Ban công',
      'WiFi miễn phí',
      'Tầm nhìn ra khung cảnh',
      'TV màn hình phẳng',
      'Điều hòa không khí',
      'Máy giặt',
      'Bếp',
      'Phòng tắm riêng'
    ];
    
    const selectedBasicAmenities = getRandomSubset(basicAmenities, 4, 7);

    // Chỗ đậu xe - random
    const hasParking = Math.random() > 0.3;
    const parkingText = hasParking 
      ? getRandomSubset(['Đỗ xe miễn phí tại khuôn viên', 'Bãi đỗ xe riêng', 'Chỗ đậu xe trong khuôn viên'], 1, 1)[0]
      : 'Không có chỗ đỗ xe.';

    // Internet - luôn có WiFi
    const internetItems = [
      'Wi-fi có ở toàn bộ khách sạn và miễn phí.'
    ];

    // Nhà bếp - random
    const kitchenItems = getRandomSubset([
      'Bếp',
      'Máy giặt',
      'Bếp nhỏ'
    ], 1, 3);

    // Phòng tắm - random
    const bathroomItems = getRandomSubset([
      'Phòng tắm riêng'
    ], 1, 1);

    // Truyền thông & Công nghệ - random
    const mediaItems = getRandomSubset([
      'TV màn hình phẳng'
    ], 1, 1);

    // Ngoài trời - random
    const outdoorItems = getRandomSubset([
      'Ban công'
    ], 0, 1);

    // Ngoài trời & Tầm nhìn - random
    const viewItems = getRandomSubset([
      'Tầm nhìn ra khung cảnh',
      'Điều hòa nhiệt độ',
      'Cấm hút thuốc trong toàn bộ khuôn viên'
    ], 1, 3);

    // Ngôn ngữ - luôn là Tiếng Việt
    const languages = ['Tiếng Việt'];

    return {
      topAmenities,
      selectedBasicAmenities,
      hasParking,
      parkingText,
      internetItems,
      kitchenItems,
      bathroomItems,
      mediaItems,
      outdoorItems,
      viewItems,
      languages
    };
  }, [hotelName]); // Dùng hotelName để mỗi khách sạn có bộ random khác nhau

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
      {/* Các tiện nghi được ưa chuộng nhất */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Các tiện nghi được ưa chuộng nhất</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {amenitiesData.topAmenities.map((amenity, idx) => (
            <div key={idx} className="flex items-center gap-3 text-gray-700 bg-gray-50 px-4 py-3 rounded-lg">
              <div className="text-green-600">{amenity.icon}</div>
              <span className="font-medium text-sm">{amenity.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cực kỳ phù hợp cho kỳ lưu trú của bạn */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-gray-700" />
            <h4 className="font-semibold text-gray-800">Cực kỳ phù hợp cho kỳ lưu trú của bạn</h4>
          </div>
          <ul className="space-y-2.5">
            {amenitiesData.selectedBasicAmenities.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Chỗ đậu xe */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <ParkingCircle className="w-5 h-5 text-gray-700" />
            <h4 className="font-semibold text-gray-800">Chỗ đậu xe</h4>
          </div>
          <p className="text-sm text-gray-600">{amenitiesData.parkingText}</p>
        </div>

        {/* Internet */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Wifi className="w-5 h-5 text-gray-700" />
            <h4 className="font-semibold text-gray-800">Internet</h4>
          </div>
          <ul className="space-y-2">
            {amenitiesData.internetItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Nhà bếp */}
        {amenitiesData.kitchenItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CookingPot className="w-5 h-5 text-gray-700" />
              <h4 className="font-semibold text-gray-800">Nhà bếp</h4>
            </div>
            <ul className="space-y-2">
              {amenitiesData.kitchenItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Phòng tắm */}
        {amenitiesData.bathroomItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bath className="w-5 h-5 text-gray-700" />
              <h4 className="font-semibold text-gray-800">Phòng tắm</h4>
            </div>
            <ul className="space-y-2">
              {amenitiesData.bathroomItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Truyền thông & Công nghệ */}
        {amenitiesData.mediaItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-5 h-5 text-gray-700" />
              <h4 className="font-semibold text-gray-800">Truyền thông & Công nghệ</h4>
            </div>
            <ul className="space-y-2">
              {amenitiesData.mediaItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ngoài trời */}
        {amenitiesData.outdoorItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trees className="w-5 h-5 text-gray-700" />
              <h4 className="font-semibold text-gray-800">Ngoài trời</h4>
            </div>
            <ul className="space-y-2">
              {amenitiesData.outdoorItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ngoài trời & Tầm nhìn */}
        {amenitiesData.viewItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sun className="w-5 h-5 text-gray-700" />
              <h4 className="font-semibold text-gray-800">Ngoài trời & Tầm nhìn</h4>
            </div>
            <ul className="space-y-2">
              {amenitiesData.viewItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ngôn ngữ được sử dụng */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Languages className="w-5 h-5 text-gray-700" />
            <h4 className="font-semibold text-gray-800">Ngôn ngữ được sử dụng</h4>
          </div>
          <ul className="space-y-2">
            {amenitiesData.languages.map((lang, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{lang}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
