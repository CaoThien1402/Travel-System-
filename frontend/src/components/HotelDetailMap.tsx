import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Fix for default marker icons in React-Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Địa điểm nổi tiếng ở TP.HCM với tọa độ
const FAMOUS_PLACES = {
  museums: [
    { name: 'Bảo tàng Lịch sử Việt Nam', lat: 10.7875, lng: 106.7047, category: 'Bảo tàng' },
    { name: 'Bảo tàng Thành phố Hồ Chí Minh', lat: 10.7769, lng: 106.6993, category: 'Bảo tàng' },
    { name: 'Bảo tàng Mỹ thuật', lat: 10.7704, lng: 106.6977, category: 'Bảo tàng' },
    { name: 'Bảo tàng Chứng tích Chiến tranh', lat: 10.7795, lng: 106.6922, category: 'Bảo tàng' },
    { name: 'Bảo tàng Hồ Chí Minh', lat: 10.7697, lng: 106.7058, category: 'Bảo tàng' },
  ],
  parks: [
    { name: 'Thảo Cầm Viên Sài Gòn', lat: 10.7875, lng: 106.7058, category: 'Công viên' },
    { name: 'Công viên 23 Tháng 9', lat: 10.7675, lng: 106.6881, category: 'Công viên' },
    { name: 'Công viên Tao Đàn', lat: 10.7747, lng: 106.6912, category: 'Công viên' },
    { name: 'Công viên Gia Định', lat: 10.8147, lng: 106.6789, category: 'Công viên' },
    { name: 'Công viên Lê Thị Riêng', lat: 10.7832, lng: 106.6728, category: 'Công viên' },
  ],
  touristAreas: [
    { name: 'Phố đi bộ Nguyễn Huệ', lat: 10.7739, lng: 106.7022, category: 'Khu du lịch' },
    { name: 'Chợ Bến Thành', lat: 10.7725, lng: 106.6980, category: 'Khu du lịch' },
    { name: 'Phố đi bộ Bùi Viện', lat: 10.7675, lng: 106.6922, category: 'Khu du lịch' },
    { name: 'Landmark 81', lat: 10.7950, lng: 106.7219, category: 'Khu du lịch' },
    { name: 'Khu du lịch Suối Tiên', lat: 10.8714, lng: 106.8025, category: 'Khu du lịch' },
    { name: 'Đầm Sen', lat: 10.7639, lng: 106.6333, category: 'Khu du lịch' },
  ],
  restaurants: [
    { name: 'Phố ẩm thực Vĩnh Khánh', lat: 10.7527, lng: 106.6983, category: 'Ẩm thực' },
    { name: 'Phố ẩm thực Hồ Thị Kỷ', lat: 10.7589, lng: 106.6708, category: 'Ẩm thực' },
    { name: 'Takashimaya Saigon Centre', lat: 10.7736, lng: 106.7006, category: 'TTTM' },
    { name: 'Vincom Center Đồng Khởi', lat: 10.7769, lng: 106.7022, category: 'TTTM' },
  ],
  lakes: [
    { name: 'Hồ Bán Nguyệt', lat: 10.7283, lng: 106.7194, category: 'Cảnh đẹp' },
    { name: 'Hồ Con Rùa', lat: 10.7808, lng: 106.6906, category: 'Cảnh đẹp' },
    { name: 'Bến cảng Nhà Rồng', lat: 10.7686, lng: 106.7058, category: 'Cảnh đẹp' },
    { name: 'Cầu Ánh Sao', lat: 10.7283, lng: 106.7175, category: 'Cảnh đẹp' },
  ],
  publicTransport: [
    { name: 'Ga Hòa Hưng', lat: 10.7842, lng: 106.6758, category: 'Giao thông' },
    { name: 'Bến xe Miền Đông mới', lat: 10.8700, lng: 106.8000, category: 'Giao thông' },
    { name: 'Bến xe Miền Tây', lat: 10.7394, lng: 106.6197, category: 'Giao thông' },
    { name: 'Metro Bến Thành', lat: 10.7725, lng: 106.6975, category: 'Giao thông' },
  ],
  airports: [
    { name: 'Sân bay Quốc tế Tân Sơn Nhất', lat: 10.8188, lng: 106.6519, category: 'Sân bay' },
  ],
  center: [
    { name: 'Nhà thờ Đức Bà', lat: 10.7798, lng: 106.6991, category: 'Di tích' },
    { name: 'Dinh Độc Lập', lat: 10.7770, lng: 106.6953, category: 'Di tích' },
    { name: 'Bưu điện Trung tâm', lat: 10.7797, lng: 106.6997, category: 'Di tích' },
    { name: 'Nhà hát Thành phố', lat: 10.7769, lng: 106.7031, category: 'Di tích' },
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
  return `${km.toFixed(1)} km`;
}

// Hotel marker icon (blue - larger)
const hotelIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iNDIiIHZpZXdCb3g9IjAgMCAzNiA0MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTggMEM4LjA1OSAwIDAgOC4wNTkgMCAxOGMwIDEzLjUgMTggMjQgMTggMjRzMTgtMTAuNSAxOC0yNGMwLTkuOTQxLTguMDU5LTE4LTE4LTE4eiIgZmlsbD0iIzI1NjNlYiIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iMTgiIHI9IjEwIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0xMyAxNWg2djZoLTZ6IiBmaWxsPSIjMjU2M2ViIi8+PHBhdGggZD0iTTE0IDEzaDR2MmgtNHoiIGZpbGw9IiMyNTYzZWIiLz48L3N2Zz4=',
  iconSize: [36, 42],
  iconAnchor: [18, 42],
  popupAnchor: [0, -42],
});

// POI marker icon (green - smaller, standard Leaflet style)
const poiIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIuNSAwQzUuNTk2IDAgMCA1LjU5NiAwIDEyLjVjMCA5LjM3NSAxMi41IDE2LjY2NyAxMi41IDE2LjY2N3MxMi41LTcuMjkyIDEyLjUtMTYuNjY3QzI1IDUuNTk2IDE5LjQwNCAwIDEyLjUgMHoiIGZpbGw9IiMxMGI5ODEiLz48Y2lyY2xlIGN4PSIxMi41IiBjeT0iMTIuNSIgcj0iNiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41],
});

interface HotelDetailMapProps {
  hotelName: string;
  lat: number;
  lng: number;
  maxDistance?: number; // km
}

interface POI {
  name: string;
  lat: number;
  lng: number;
  category: string;
  distance: number;
}

export default function HotelDetailMap({ hotelName, lat, lng, maxDistance = 5 }: HotelDetailMapProps) {
  // Get all nearby POIs within maxDistance
  const nearbyPOIs = useMemo(() => {
    const allPlaces: POI[] = [];
    
    Object.values(FAMOUS_PLACES).forEach(places => {
      places.forEach((place: any) => {
        const distance = calculateDistance(lat, lng, place.lat, place.lng);
        if (distance <= maxDistance) {
          allPlaces.push({
            name: place.name,
            lat: place.lat,
            lng: place.lng,
            category: place.category,
            distance,
          });
        }
      });
    });
    
    // Sort by distance and limit to top 15
    return allPlaces.sort((a, b) => a.distance - b.distance).slice(0, 15);
  }, [lat, lng, maxDistance]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        Bản đồ & Địa điểm lân cận
      </h2>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200">
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          <span className="text-xs font-medium text-blue-700">Khách sạn</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-700">Địa điểm nổi bật ({nearbyPOIs.length})</span>
        </div>
      </div>

      {/* Map */}
      <div className="h-[400px] rounded-xl overflow-hidden border border-gray-200">
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Hotel Marker */}
          <Marker position={[lat, lng]} icon={hotelIcon}>
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
                      <path d="m9 16 .348-.24c1.465-1.013 3.84-1.013 5.304 0L15 16"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{hotelName}</h3>
                    <span className="text-xs text-blue-600 font-medium">Khách sạn của bạn</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>

          {/* POI Markers */}
          {nearbyPOIs.map((poi, index) => (
            <Marker
              key={`${poi.name}-${index}`}
              position={[poi.lat, poi.lng]}
              icon={poiIcon}
            >
              <Popup>
                <div className="p-2 min-w-[180px]">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <MapPin size={14} color="white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm leading-tight">{poi.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                          {poi.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistance(poi.distance)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* POI count info */}
      <p className="text-sm text-gray-500 mt-3 text-center">
        Hiển thị {nearbyPOIs.length} địa điểm nổi bật trong bán kính {maxDistance} km
      </p>
    </div>
  );
}
