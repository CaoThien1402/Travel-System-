import { Hotel, Menu, User, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Đóng mobile menu khi resize về desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      setIsMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-soft">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Hotel className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">3T2M1Stay</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">
              Trang chủ
            </Link>
            <Link to="/search" className="text-muted-foreground hover:text-primary transition-colors">
              Tìm khách sạn
            </Link>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : user ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 hover:bg-accent focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="max-w-[150px] truncate">
                      {user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <ScrollArea className="h-[200px] pr-3">
                    <div className="space-y-1 pr-1">
                      <DropdownMenuItem 
                        onClick={() => handleNavigation('/dashboard')} 
                        className="cursor-pointer focus:bg-accent"
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleNavigation('/profile')} 
                        className="cursor-pointer focus:bg-accent"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Hồ sơ cá nhân
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleNavigation('/bookings')} 
                        className="cursor-pointer focus:bg-accent"
                      >
                        <Hotel className="w-4 h-4 mr-2" />
                        Đặt phòng của tôi
                      </DropdownMenuItem>
                      {/* Thêm items mẫu để thấy scroll */}
                      <DropdownMenuItem className="cursor-pointer focus:bg-accent">
                        <Hotel className="w-4 h-4 mr-2" />
                        Yêu thích
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer focus:bg-accent">
                        <Hotel className="w-4 h-4 mr-2" />
                        Lịch sử tìm kiếm
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer focus:bg-accent">
                        <Hotel className="w-4 h-4 mr-2" />
                        Cài đặt
                      </DropdownMenuItem>
                    </div>
                  </ScrollArea>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title={isMenuOpen ? "Close menu" : "Open menu"}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            <Menu className="w-6 h-6 text-foreground" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-3">
              <Link 
                to="/" 
                className="text-foreground hover:text-primary transition-colors py-2 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Trang chủ
              </Link>
              <Link 
                to="/search" 
                className="text-muted-foreground hover:text-primary transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Tìm khách sạn
              </Link>
              
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
                {loading ? (
                  <div className="py-2">
                    <div className="w-full h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : user ? (
                  <>
                    <div className="py-2 text-sm text-muted-foreground font-medium">
                      {user.email}
                    </div>
                    <ScrollArea className="h-auto max-h-[300px]">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start hover:bg-accent"
                          onClick={() => {
                            navigate('/dashboard');
                            setIsMenuOpen(false);
                          }}
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Dashboard
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start hover:bg-accent"
                          onClick={() => {
                            navigate('/profile');
                            setIsMenuOpen(false);
                          }}
                        >
                          <User className="w-4 h-4 mr-2" />
                          Hồ sơ cá nhân
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start hover:bg-accent"
                          onClick={() => {
                            navigate('/bookings');
                            setIsMenuOpen(false);
                          }}
                        >
                          <Hotel className="w-4 h-4 mr-2" />
                          Đặt phòng của tôi
                        </Button>
                      </div>
                    </ScrollArea>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:bg-red-50 mt-2 border-t pt-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Đăng xuất
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;