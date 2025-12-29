import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for user location (red)
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iI0VGNDQ0NCIgZmlsbC1vcGFjaXR5PSIwLjMiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI4IiBmaWxsPSIjRUY0NDQ0Ii8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Custom hotel marker icon
const hotelIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iNDIiIHZpZXdCb3g9IjAgMCAzNiA0MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTggMEM4LjA1OSAwIDAgOC4wNTkgMCAxOGMwIDEzLjUgMTggMjQgMTggMjRzMTgtMTAuNSAxOC0yNGMwLTkuOTQxLTguMDU5LTE4LTE4LTE4eiIgZmlsbD0iIzNCODJGNiIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iMTgiIHI9IjEwIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0xMyAxNWg2djZoLTZ6IiBmaWxsPSIjM0I4MkY2Ii8+PHBhdGggZD0iTTE0IDEzaDR2MmgtNHoiIGZpbGw9IiMzQjgyRjYiLz48L3N2Zz4=',
  iconSize: [36, 42],
  iconAnchor: [18, 42],
  popupAnchor: [0, -42],
});

interface Hotel {
  id: number;
  hotelname: string;
  address: string;
  district: string;
  price: number;
  star: number;
  lat: number;
  lng: number;
  imageUrl?: string;
  reviewsCount?: number;
  totalScore?: number;
}

interface HotelMapProps {
  hotels: Hotel[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (hotel: Hotel) => void;
  userLocation?: [number, number] | null;
  routeCoordinates?: [number, number][];
}

// Only change view when center changes significantly (more than 0.01 degrees)
let lastCenter: [number, number] = [0, 0];
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    const centerChanged = Math.abs(center[0] - lastCenter[0]) > 0.01 || Math.abs(center[1] - lastCenter[1]) > 0.01;
    if (centerChanged) {
      map.setView(center, zoom);
      lastCenter = center;
    }
  }, [center, zoom, map]);
  return null;
}

const HotelMap = ({ 
  hotels, 
  center = [10.7769, 106.7009] as [number, number], // Ho Chi Minh City center
  zoom = 13,
  onMarkerClick,
  userLocation,
  routeCoordinates
}: HotelMapProps) => {
  const navigate = useNavigate();
  
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', borderRadius: '12px' }}
      scrollWheelZoom={true}
    >
      <ChangeView center={center} zoom={zoom} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* User location marker */}
      {userLocation && (
        <Marker
          position={userLocation}
          icon={userIcon}
        >
          <Popup>
            <div className="p-3 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
              </div>
              <h3 className="font-bold text-sm text-gray-800">Vị trí của bạn</h3>
              <p className="text-xs text-gray-500 mt-1">Vị trí hiện tại</p>
            </div>
          </Popup>
        </Marker>
      )}
      
      {/* Route from OSRM */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <Polyline
          positions={routeCoordinates}
          color="#3b82f6"
          weight={4}
          opacity={0.8}
        />
      )}
      
      {/* Hotel markers */}
      {hotels.map((hotel) => (
        <Marker
          key={hotel.id}
          position={[hotel.lat, hotel.lng] as [number, number]}
          icon={hotelIcon}
          eventHandlers={{
            click: () => onMarkerClick?.(hotel),
          }}
        >
          <Popup>
            <div className="min-w-[280px] max-w-[320px]">
              {/* Hotel Image */}
              {hotel.imageUrl && (
                <div className="w-full h-32 -mt-3 -mx-3 mb-3 overflow-hidden rounded-t-lg" style={{ width: 'calc(100% + 24px)' }}>
                  <img 
                    src={hotel.imageUrl} 
                    alt={hotel.hotelname}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              {/* Hotel Info */}
              <div className="px-1">
                <h3 className="font-bold text-base text-gray-800 mb-1 line-clamp-2">{hotel.hotelname}</h3>
                
                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-500 text-sm">{'⭐'.repeat(Math.floor(hotel.star))}</span>
                  {hotel.reviewsCount && (
                    <span className="text-xs text-gray-500">({hotel.reviewsCount} đánh giá)</span>
                  )}
                </div>
                
                {/* Location */}
                <p className="text-xs text-gray-600 mb-3 flex items-start gap-1">
                  <span className="text-gray-400 mt-0.5">📍</span>
                  <span className="line-clamp-2">{hotel.district}</span>
                </p>
                
                {/* Price and Button */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Giá từ</p>
                    <p className="text-lg font-bold text-blue-600">
                      {hotel.price.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/properties/${hotel.id}`, '_blank');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default HotelMap;
