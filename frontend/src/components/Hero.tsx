import heroImage from "@/assets/hero-hotel.jpg";

const Hero = () => {
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white mb-1">10,000+</div>
            <div className="text-sm md:text-base text-white/80">Khách sạn</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-white mb-1">50,000+</div>
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
