import { Hotel, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-soft">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Hotel className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">3T2M1Stay</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <a href="/" className="text-foreground hover:text-primary transition-colors font-medium">
              Trang chủ
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Khách sạn
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Homestay
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Ưu đãi
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                <User className="w-4 h-4 mr-2" />
                Đăng nhập
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-primary hover:bg-primary-hover transition-colors">
                Đăng ký
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title={isMenuOpen ? "Close menu" : "Open menu"}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen ? true : false}
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-3">
              <a href="/" className="text-foreground hover:text-primary transition-colors py-2 font-medium">
                Trang chủ
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors py-2">
                Khách sạn
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors py-2">
                Homestay
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors py-2">
                Ưu đãi
              </a>
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="w-full justify-center">
                    <User className="w-4 h-4 mr-2" />
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="w-full bg-primary hover:bg-primary-hover">
                    Đăng ký
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
