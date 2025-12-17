import { Building2, Users, Shield, Award, Heart, TrendingUp, CheckCircle, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => {
  const values = [
    {
      icon: Shield,
      title: "Tin Cậy & An Toàn",
      description: "Chúng tôi cam kết bảo mật thông tin và giao dịch an toàn cho mọi khách hàng"
    },
    {
      icon: Heart,
      title: "Tận Tâm Phục Vụ",
      description: "Đội ngũ hỗ trợ 24/7 luôn sẵn sàng giải đáp mọi thắc mắc của bạn"
    },
    {
      icon: TrendingUp,
      title: "Giá Tốt Nhất",
      description: "Cam kết giá tốt nhất thị trường với nhiều ưu đãi hấp dẫn"
    },
    {
      icon: Award,
      title: "Chất Lượng Hàng Đầu",
      description: "Hợp tác với các khách sạn & resort uy tín, chất lượng cao"
    }
  ];

  const achievements = [
    { number: "3000+", label: "Khách sạn tại TP.HCM" },
    { number: "50K+", label: "Khách hàng hài lòng" },
    { number: "8K+", label: "Đánh giá tích cực" },
    { number: "4.9/5", label: "Điểm đánh giá" }
  ];

  const features = [
    "Đặt phòng nhanh chóng chỉ trong 2 phút",
    "Thanh toán an toàn với nhiều phương thức",
    "Hủy miễn phí trong 24h trước khi check-in",
    "Hỗ trợ khách hàng 24/7 qua hotline & chat",
    "Tích điểm và nhận ưu đãi độc quyền",
    "Xem đánh giá thật từ khách hàng"
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'Tahoma, Verdana, sans-serif' }}>
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-sky-400 via-blue-500 to-cyan-400 py-20 md:py-32">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-6">
                <Building2 className="w-4 h-4 text-white" />
                <span className="text-sm text-white font-medium">Về 3T2M1Stay</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Nền Tảng Tìm Kiếm
                <br />
                <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                  Khách Sạn TP.HCM
                </span>
              </h1>
              <p className="text-lg md:text-xl text-white/90 leading-relaxed">
                3T2M1Stay - Nền tảng tìm kiếm khách sạn hàng đầu tại TP. Hồ Chí Minh, kết nối bạn với hàng trăm khách sạn & resort cao cấp trong thành phố
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary font-medium">Sứ Mệnh</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Khám Phá TP.HCM Cùng Chúng Tôi
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                    Chúng tôi tin rằng mỗi chuyến đi đến TP. Hồ Chí Minh đều đáng nhớ. Với 3T2M1Stay, việc tìm kiếm và đặt phòng khách sạn tại Sài Gòn trở nên dễ dàng, nhanh chóng và đáng tin cậy hơn bao giờ hết.
                  </p>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Đội ngũ của chúng tôi làm việc không ngừng để mang đến những lựa chọn khách sạn tốt nhất tại TP.HCM, với giá cả cạnh tranh và dịch vụ chăm sóc khách hàng xuất sắc.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {achievements.map((item, index) => (
                    <Card key={index} className="p-6 text-center bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
                      <div className="text-4xl font-bold text-primary mb-2">{item.number}</div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium">Giá Trị Cốt Lõi</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Những Giá Trị Chúng Tôi Mang Lại
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Cam kết của chúng tôi là mang đến trải nghiệm đặt phòng tuyệt vời nhất
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <Card key={index} className="p-6 hover:shadow-lg transition-shadow duration-300 bg-card">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground">{value.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Tại Sao Chọn 3T2M1Stay?
                </h2>
                <p className="text-muted-foreground text-lg">
                  Những tính năng vượt trội giúp bạn đặt phòng dễ dàng hơn
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-foreground font-medium">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-sky-400 via-blue-500 to-cyan-400">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Sẵn Sàng Khám Phá?
              </h2>
              <p className="text-white/90 text-lg mb-8">
                Tìm kiếm và đặt phòng khách sạn hoàn hảo cho chuyến đi tiếp theo của bạn ngay hôm nay
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/"
                  className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors inline-block"
                >
                  Khám phá khách sạn
                </a>
                <a
                  href="/register"
                  className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors inline-block"
                >
                  Đăng ký ngay
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
