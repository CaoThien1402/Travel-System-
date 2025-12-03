import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Hotel {
  id: number;
  hotelname: string;
  address: string;
  district: string;
  price: number;
  star: number;
  lat: number;
  lon: number;
  imageUrl?: string;
}

interface HotelMapProps {
  hotels: Hotel[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (hotel: Hotel) => void;
}

const HotelMap = ({ 
  hotels, 
  center = [10.7769, 106.7009] as [number, number], // Ho Chi Minh City center
  zoom = 13,
  onMarkerClick 
}: HotelMapProps) => {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%', borderRadius: '12px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {hotels.map((hotel) => (
        <Marker
          key={hotel.id}
          position={[hotel.lat, hotel.lon] as [number, number]}
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
