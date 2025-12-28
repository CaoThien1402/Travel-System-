import { useState, useEffect } from "react";
import { Cloud, Droplets, Wind, MapPin, Sun, CloudRain, CloudSun, Snowflake, CloudFog } from "lucide-react";
import heroImage from "@/assets/hero-hotel.jpg";

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
  weatherCode: number;
  wind_speed: number;
}

// Weather code to description (WMO codes)
const getWeatherDescription = (code: number): string => {
  if (code === 0) return "Trời quang";
  if (code <= 3) return "Có mây";
  if (code <= 49) return "Sương mù";
  if (code <= 59) return "Mưa phùn";
  if (code <= 69) return "Mưa";
  if (code <= 79) return "Tuyết";
  if (code <= 84) return "Mưa rào";
  if (code <= 94) return "Mưa đá";
  return "Giông bão";
};

// Weather code to icon component
const WeatherIcon = ({ code, className }: { code: number; className?: string }) => {
  if (code === 0) return <Sun className={className} />;
  if (code <= 3) return <CloudSun className={className} />;
  if (code <= 49) return <CloudFog className={className} />;
  if (code <= 69) return <CloudRain className={className} />;
  if (code <= 79) return <Snowflake className={className} />;
  return <Cloud className={className} />;
};

const Hero = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Ho Chi Minh City coordinates: 10.8231, 106.6297
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=10.8231&longitude=106.6297&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FHo_Chi_Minh'
        );
        const data = await response.json();
        
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            feels_like: Math.round(data.current.apparent_temperature),
            humidity: data.current.relative_humidity_2m,
            description: getWeatherDescription(data.current.weather_code),
            weatherCode: data.current.weather_code,
            wind_speed: Math.round(data.current.wind_speed_10m),
          });
          setWeatherError(false);
        } else {
          setWeatherError(true);
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeatherError(true);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex items-center justify-center pt-16">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Luxury Hotel"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/40 to-foreground/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            Tìm Nơi Nghỉ Dưỡng Hoàn Hảo
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Khám phá hàng ngàn khách sạn & homestay với giá tốt nhất
          </p>
          <p className="text-sm md:text-base text-white/80 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            Đặt phòng dễ dàng • Thanh toán linh hoạt • Hủy miễn phí
          </p>

          {/* Weather Widget - Centered below text */}
          <div className="flex justify-center mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            {weatherLoading ? (
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 animate-pulse min-w-[320px]">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/30 rounded-full"></div>
                  <div className="space-y-3">
                    <div className="w-20 h-6 bg-white/30 rounded"></div>
                    <div className="w-28 h-4 bg-white/30 rounded"></div>
                  </div>
                </div>
              </div>
            ) : weather ? (
              <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md rounded-2xl px-6 py-5 text-white border border-white/25 shadow-2xl hover:from-white/25 hover:to-white/15 transition-all duration-300">
                {/* Header */}
                <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-white/20">
                  <MapPin className="w-4 h-4 text-white/90" />
                  <span className="text-sm font-medium text-white/90">Thời tiết tại TP. Hồ Chí Minh</span>
                </div>
                
                {/* Main Content */}
                <div className="flex items-center gap-6">
                  {/* Icon & Temp */}
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-yellow-400/30 to-orange-400/20 rounded-2xl shadow-lg">
                      <WeatherIcon code={weather.weatherCode} className="w-12 h-12 text-yellow-300 drop-shadow-lg" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold tracking-tight">{weather.temp}</span>
                        <span className="text-2xl text-white/70 ml-1">°C</span>
                      </div>
                      <p className="text-base text-white/90 font-medium mt-1">{weather.description}</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-20 bg-white/20"></div>

                  {/* Details */}
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <Droplets className="w-4 h-4 text-blue-300" />
                      </div>
                      <div className="text-left">
                        <p className="text-white/60 text-xs">Độ ẩm</p>
                        <p className="font-semibold">{weather.humidity}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <Wind className="w-4 h-4 text-cyan-300" />
                      </div>
                      <div className="text-left">
                        <p className="text-white/60 text-xs">Tốc độ gió</p>
                        <p className="font-semibold">{weather.wind_speed} km/h</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-white/20 text-center">
                  <p className="text-xs text-white/50">Cảm giác như <span className="text-white/80 font-medium">{weather.feels_like}°C</span> • Cập nhật tự động</p>
                </div>
              </div>
            ) : weatherError ? (
              <div className="bg-white/15 backdrop-blur-md rounded-2xl px-6 py-5 text-white border border-white/20 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 flex items-center justify-center bg-white/10 rounded-2xl">
                    <Cloud className="w-10 h-10 text-white/60" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-white/80" />
                      <span className="text-sm font-medium text-white/80">TP. Hồ Chí Minh</span>
                    </div>
                    <p className="text-base text-white/70">Đang cập nhật thời tiết...</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white mb-1">3,000+</div>
            <div className="text-sm md:text-base text-white/80">Khách sạn</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white mb-1">6,000+</div>
            <div className="text-sm md:text-base text-white/80">Đánh giá</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white mb-1">4.8★</div>
            <div className="text-sm md:text-base text-white/80">Điểm trung bình</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
