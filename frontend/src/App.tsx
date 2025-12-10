import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Chatbot from "./components/Chatbot";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import PropertyDetail from "./pages/PropertyDetail";
import HotelSearch from "./pages/HotelSearch";
import { Dashboard } from "@/pages/Dashboard";
import { AuthCallback } from "@/pages/AuthCallback";
import Profile from "@/pages/Profile";

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/search" element={<HotelSearch />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <BookingsPage />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* Chatbot - hiển thị ở tất cả trang */}
          <Chatbot />
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  );
}

// Temporary Bookings Page component
const BookingsPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Đặt phòng của tôi</h1>
      <p className="text-gray-600">Tính năng đang phát triển...</p>
    </div>
  </div>
);

export default App;