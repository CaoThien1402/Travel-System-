import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, Phone, Globe, ArrowLeft, Wifi, Car, Coffee, Dumbbell, Waves, Utensils, SprayCan, Wine, Baby, Accessibility, Plane, ChevronRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import HotelPOI from '../components/HotelPOI';

interface Hotel {
  id: number;
  hotelname: string;
  address: string;
  street: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  description1: string;
  description2: string;
  url_google: string;
  website: string;
  phone: string;
  price: number;
  imageUrl: string;
  star: string;
  rank: number;
  totalScore: number;
  reviewsCount: number;
  amenities: string[];
  reviews: string[];
}

// Map amenities to icons
const amenityIcons: Record<string, React.ReactNode> = {
  'Wi-Fi miễn phí': <Wifi className="w-4 h-4" />,
  'Đỗ xe miễn phí': <Car className="w-4 h-4" />,
  'Bãi đỗ xe': <Car className="w-4 h-4" />,
  'Bữa sáng miễn phí': <Coffee className="w-4 h-4" />,
  'Bữa sáng có tính phí': <Coffee className="w-4 h-4" />,
  'Trung tâm thể dục': <Dumbbell className="w-4 h-4" />,
  'Bể bơi': <Waves className="w-4 h-4" />,
  'Bể bơi ngoài trời': <Waves className="w-4 h-4" />,
  'Nhà hàng': <Utensils className="w-4 h-4" />,
  'Spa': <SprayCan className="w-4 h-4" />,
  'Quán bar': <Wine className="w-4 h-4" />,
  'Phù hợp với trẻ em': <Baby className="w-4 h-4" />,
  'Phù hợp cho người khuyết tật': <Accessibility className="w-4 h-4" />,
  'Xe đưa đón ra sân bay': <Plane className="w-4 h-4" />,
};

export default function HotelDetail() {
  const { id } = useParams();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHotel() {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/properties/${id}`);
        if (!response.ok) {
          throw new Error('Không thể tải thông tin khách sạn');
        }
        const data = await response.json();
        setHotel(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHotel();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Link to="/search" className="text-blue-600 hover:underline mt-2 inline-block">
              ← Quay lại tìm kiếm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-center text-gray-600">Không tìm thấy khách sạn</p>
        </div>
      </div>
    );
  }

  // Parse star rating
  const starMatch = hotel.star?.match(/(\d+)/);
  const starRating = starMatch ? parseInt(starMatch[1]) : 0;

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-blue-600">Trang chủ</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/search" className="hover:text-blue-600">Tìm kiếm</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium truncate">{hotel.hotelname}</span>
        </nav>

        {/* Back button */}
        <Link 
          to="/search" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại kết quả tìm kiếm
        </Link>

        {/* Hotel Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Image */}
          <div className="relative h-72 md:h-96 bg-gray-200">
            <img 
              src={hotel.imageUrl || '/placeholder-hotel.jpg'} 
              alt={hotel.hotelname}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';
              }}
            />
            {starRating > 0 && (
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-sm">{starRating} sao</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {hotel.hotelname}
                </h1>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{hotel.address}</span>
                </div>

                {/* Rating */}
                {hotel.totalScore > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-600 text-white px-2.5 py-1 rounded-lg font-bold text-sm">
                      {hotel.totalScore.toFixed(1)}
                    </div>
                    <span className="text-sm text-gray-600">
                      {hotel.reviewsCount} đánh giá
                    </span>
                  </div>
                )}
              </div>

              {/* Price & Actions */}
              <div className="md:text-right">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {formatPrice(hotel.price)}
                  <span className="text-sm font-normal text-gray-500">/đêm</span>
                </div>
                <div className="flex flex-col gap-2">
                  {hotel.website && (
                    <a 
                      href={hotel.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Globe className="w-4 h-4" />
                      Đặt phòng
                    </a>
                  )}
                  {hotel.phone && (
                    <a 
                      href={`tel:${hotel.phone}`}
                      className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      <Phone className="w-4 h-4" />
                      {hotel.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {(hotel.description1 || hotel.description2) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Mô tả</h2>
            {hotel.description1 && (
              <p className="text-gray-700 mb-4 leading-relaxed">{hotel.description1}</p>
            )}
            {hotel.description2 && (
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{hotel.description2}</p>
            )}
          </div>
        )}

        {/* Amenities */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tiện nghi</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {hotel.amenities.map((amenity, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-700"
                >
                  {amenityIcons[amenity] || <div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0" />}
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POI - Points of Interest */}
        {hotel.lat && hotel.lng && (
          <HotelPOI lat={hotel.lat} lng={hotel.lng} />
        )}

        {/* Reviews */}
        {hotel.reviews && hotel.reviews.length > 0 && hotel.reviews.some(r => r) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Đánh giá từ khách ({hotel.reviews.filter(r => r).length})
            </h2>
            <div className="space-y-4">
              {hotel.reviews.filter(r => r).slice(0, 5).map((review, index) => (
                <div 
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500"
                >
                  <p className="text-gray-700 text-sm leading-relaxed">{review}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Maps Link */}
        {hotel.url_google && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Vị trí</h2>
            <a 
              href={hotel.url_google}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <MapPin className="w-5 h-5" />
              Xem trên Google Maps
            </a>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}