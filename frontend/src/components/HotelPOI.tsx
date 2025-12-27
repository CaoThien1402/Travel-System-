import { useMemo } from 'react';
import { MapPin, Utensils, Building2, Plane, Train, Mountain, Landmark } from 'lucide-react';

// Địa điểm nổi tiếng ở TP.HCM với tọa độ
const FAMOUS_PLACES = {
  // Bảo tàng
  museums: [
    { name: 'Bảo tàng Lịch sử Việt Nam', lat: 10.7875, lng: 106.7047 },
    { name: 'Bảo tàng Thành phố Hồ Chí Minh', lat: 10.7769, lng: 106.6993 },
    { name: 'Bảo tàng Mỹ thuật', lat: 10.7704, lng: 106.6977 },
    { name: 'Bảo tàng Chứng tích Chiến tranh', lat: 10.7795, lng: 106.6922 },
    { name: 'Bảo tàng Áo Dài', lat: 10.8633, lng: 106.8058 },
    { name: 'Bảo tàng Phụ nữ Nam Bộ', lat: 10.7657, lng: 106.6906 },
    { name: 'Bảo tàng Hồ Chí Minh', lat: 10.7697, lng: 106.7058 },
  ],
  // Công viên lớn
  parks: [
    { name: 'Thảo Cầm Viên Sài Gòn', lat: 10.7875, lng: 106.7058 },
    { name: 'Công viên 23 Tháng 9', lat: 10.7675, lng: 106.6881 },
    { name: 'Công viên Tao Đàn', lat: 10.7747, lng: 106.6912 },
    { name: 'Công viên Gia Định', lat: 10.8147, lng: 106.6789 },
    { name: 'Công viên Lê Thị Riêng', lat: 10.7832, lng: 106.6728 },
    { name: 'Công viên Hoàng Văn Thụ', lat: 10.8012, lng: 106.6617 },
    { name: 'Công viên Lê Văn Tám', lat: 10.7856, lng: 106.6917 },
  ],
  // Khu du lịch
  touristAreas: [
    { name: 'Khu du lịch Bình Quới 1', lat: 10.8355, lng: 106.7275 },
    { name: 'Khu du lịch Bình Quới 2', lat: 10.8395, lng: 106.7295 },
    { name: 'Khu du lịch Văn Thánh', lat: 10.8033, lng: 106.7189 },
    { name: 'Khu du lịch Suối Tiên', lat: 10.8714, lng: 106.8025 },
    { name: 'Đầm Sen', lat: 10.7639, lng: 106.6333 },
    { name: 'Phố đi bộ Nguyễn Huệ', lat: 10.7739, lng: 106.7022 },
    { name: 'Chợ Bến Thành', lat: 10.7725, lng: 106.6980 },
    { name: 'Phố đi bộ Bùi Viện', lat: 10.7675, lng: 106.6922 },
  ],
  // Hồ
  lakes: [
    { name: 'Hồ Bán Nguyệt', lat: 10.7283, lng: 106.7194 },
    { name: 'Hồ Con Rùa', lat: 10.7808, lng: 106.6906 },
    { name: 'Hồ Kỳ Hòa', lat: 10.7800, lng: 106.6678 },
    { name: 'Hồ Đầm Sen', lat: 10.7650, lng: 106.6342 },
  ],
  // Nhà hàng & Cafe nổi tiếng
  restaurants: [
    { name: 'Phố ẩm thực Vĩnh Khánh', lat: 10.7527, lng: 106.6983, type: 'Phố ẩm thực' },
    { name: 'Phố ẩm thực Hồ Thị Kỷ', lat: 10.7589, lng: 106.6708, type: 'Phố ẩm thực' },
    { name: 'Takashimaya Saigon Centre', lat: 10.7736, lng: 106.7006, type: 'TTTM' },
    { name: 'Landmark 81', lat: 10.7950, lng: 106.7219, type: 'TTTM' },
    { name: 'Vincom Center Đồng Khởi', lat: 10.7769, lng: 106.7022, type: 'TTTM' },
    { name: 'The Coffee House', lat: 10.7750, lng: 106.7000, type: 'Cafe/quán bar' },
    { name: 'Starbucks Nguyễn Huệ', lat: 10.7740, lng: 106.7020, type: 'Cafe/quán bar' },
    { name: 'Highlands Coffee', lat: 10.7735, lng: 106.7010, type: 'Cafe/quán bar' },
  ],
  // Cảnh đẹp thiên nhiên
  nature: [
    { name: 'Bến cảng Nhà Rồng', lat: 10.7686, lng: 106.7058 },
    { name: 'Hầm Thủ Thiêm', lat: 10.7833, lng: 106.7125 },
    { name: 'Cầu Ánh Sao', lat: 10.7283, lng: 106.7175 },
    { name: 'Bờ sông Sài Gòn', lat: 10.7833, lng: 106.7083 },
    { name: 'Cầu Thủ Thiêm 2', lat: 10.7856, lng: 106.7167 },
    { name: 'Công viên bờ sông Sài Gòn', lat: 10.7850, lng: 106.7100 },
  ],
  // Phương tiện công cộng
  publicTransport: [
    { name: 'Ga Hòa Hưng', lat: 10.7842, lng: 106.6758, type: 'Tàu lửa' },
    { name: 'Bến xe Miền Đông mới', lat: 10.8700, lng: 106.8000, type: 'Bến xe' },
    { name: 'Bến xe Miền Tây', lat: 10.7394, lng: 106.6197, type: 'Bến xe' },
    { name: 'Bến Bạch Đằng', lat: 10.7731, lng: 106.7047, type: 'Bến tàu' },
    { name: 'Metro Bến Thành', lat: 10.7725, lng: 106.6975, type: 'Metro' },
    { name: 'Metro Nhà hát TP', lat: 10.7769, lng: 106.7031, type: 'Metro' },
  ],
  // Sân bay
  airports: [
    { name: 'Sân bay Quốc tế Tân Sơn Nhất', lat: 10.8188, lng: 106.6519 },
    { name: 'Sân bay Vũng Tàu', lat: 10.3726, lng: 107.0842 },
  ],
  // Trung tâm thành phố
  center: [
    { name: 'Nhà thờ Đức Bà', lat: 10.7798, lng: 106.6991 },
    { name: 'Dinh Độc Lập', lat: 10.7770, lng: 106.6953 },
    { name: 'Bưu điện Trung tâm', lat: 10.7797, lng: 106.6997 },
    { name: 'Nhà hát Thành phố', lat: 10.7769, lng: 106.7031 },
    { name: 'UBND Thành phố', lat: 10.7769, lng: 106.7009 },
  ],
};

// Tính khoảng cách giữa 2 tọa độ (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format khoảng cách
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(0)} km`;
}

interface POIPlace {
  name: string;
  distance: string;
  distanceKm: number;
  type?: string;
}

interface POICategory {
  title: string;
  icon: React.ReactNode;
  places: POIPlace[];
}

interface HotelPOIProps {
  lat: number;
  lng: number;
}

export default function HotelPOI({ lat, lng }: HotelPOIProps) {
  const poiData = useMemo(() => {
    // Tính khoảng cách đến từng địa điểm và sắp xếp
    const calculatePlaces = (places: { name: string; lat: number; lng: number; type?: string }[], maxCount: number = 5): POIPlace[] => {
      return places
        .map(place => ({
          name: place.name,
          distanceKm: calculateDistance(lat, lng, place.lat, place.lng),
          type: place.type,
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, maxCount)
        .map(place => ({
          name: place.name,
          distance: formatDistance(place.distanceKm),
          distanceKm: place.distanceKm,
          type: place.type,
        }));
    };

    // Địa điểm tham quan hàng đầu (kết hợp museums, parks, touristAreas, center)
    const topAttractions = [
      ...FAMOUS_PLACES.museums.map(p => ({ ...p, type: 'Bảo tàng' })),
      ...FAMOUS_PLACES.parks.map(p => ({ ...p, type: 'Công viên' })),
      ...FAMOUS_PLACES.touristAreas.map(p => ({ ...p, type: 'Khu du lịch' })),
      ...FAMOUS_PLACES.center.map(p => ({ ...p, type: 'Di tích' })),
    ];

    const categories: POICategory[] = [
      {
        title: 'Địa điểm tham quan hàng đầu',
        icon: <MapPin className="w-5 h-5 text-blue-600" />,
        places: calculatePlaces(topAttractions, 10),
      },
      {
        title: 'Nhà hàng & quán cà phê',
        icon: <Utensils className="w-5 h-5 text-orange-600" />,
        places: calculatePlaces(FAMOUS_PLACES.restaurants, 5),
      },
      {
        title: 'Cảnh đẹp thiên nhiên',
        icon: <Mountain className="w-5 h-5 text-green-600" />,
        places: [
          ...calculatePlaces(FAMOUS_PLACES.nature, 3),
          ...calculatePlaces(FAMOUS_PLACES.lakes.map(l => ({ ...l, type: 'Hồ' })), 2),
        ].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5),
      },
      {
        title: 'Phương tiện công cộng',
        icon: <Train className="w-5 h-5 text-purple-600" />,
        places: calculatePlaces(FAMOUS_PLACES.publicTransport, 4),
      },
      {
        title: 'Các sân bay gần nhất',
        icon: <Plane className="w-5 h-5 text-sky-600" />,
        places: calculatePlaces(FAMOUS_PLACES.airports, 2),
      },
    ];

    // Thêm thông tin khoảng cách đến trung tâm
    const distanceToCenter = calculateDistance(lat, lng, 10.7769, 106.7009);
    const distanceToAirport = calculateDistance(lat, lng, 10.8188, 106.6519);

    return {
      categories,
      distanceToCenter: formatDistance(distanceToCenter),
      distanceToAirport: formatDistance(distanceToAirport),
    };
  }, [lat, lng]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Landmark className="w-6 h-6 text-blue-600" />
        Các địa điểm xung quanh
      </h2>

      {/* Quick Info */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <span className="text-sm text-gray-600">Cách trung tâm Quận 1:</span>
          <span className="font-semibold text-indigo-700">{poiData.distanceToCenter}</span>
        </div>
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-sky-600" />
          <span className="text-sm text-gray-600">Cách sân bay Tân Sơn Nhất:</span>
          <span className="font-semibold text-sky-700">{poiData.distanceToAirport}</span>
        </div>
      </div>

      {/* POI Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {poiData.categories.map((category, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 pb-2 border-b border-gray-100">
              {category.icon}
              {category.title}
            </h3>
            <ul className="space-y-2.5">
              {category.places.map((place, placeIdx) => (
                <li key={placeIdx} className="flex justify-between items-start text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    {place.type && (
                      <span className="text-gray-400 text-xs">{place.type} · </span>
                    )}
                    <span className="text-gray-700">{place.name}</span>
                  </div>
                  <span className="text-gray-500 font-medium whitespace-nowrap bg-gray-50 px-2 py-0.5 rounded text-xs">
                    {place.distance}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
        * Khoảng cách được tính theo đường chim bay. Khoảng cách thực tế có thể khác tùy theo tuyến đường di chuyển.
      </p>
    </div>
  );
}
