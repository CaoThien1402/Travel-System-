import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
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
}

interface HotelMapProps {
  hotels: Hotel[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (hotel: Hotel) => void;
  userLocation?: [number, number] | null;
  routeCoordinates?: [number, number][];
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
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
            <div className="p-2">
              <h3 className="font-semibold text-sm">Vị trí của bạn</h3>
              <p className="text-xs text-gray-600">Vị trí hiện tại</p>
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
          eventHandlers={{
            click: () => onMarkerClick?.(hotel),
          }}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <h3 className="font-semibold text-sm mb-1">{hotel.hotelname}</h3>
              <p className="text-xs text-gray-600 mb-2">{hotel.district}</p>
              <div className="flex items-center justify-between">
                <span className="text-yellow-500">{'⭐'.repeat(Math.floor(hotel.star))}</span>
                <span className="font-bold text-primary">
                  {hotel.price.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default HotelMap;
