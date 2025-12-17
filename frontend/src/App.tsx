import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { AuthProvider } from "@/contexts/AuthContext";
import Chatbot from "@/components/Chatbot";

// Pages
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import HotelSearch from "@/pages/HotelSearch";
import PropertyDetail from "@/pages/PropertyDetail";
import { Dashboard } from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Wishlist from "@/pages/Wishlist";
import About from "@/pages/About";
import { AuthCallback } from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";

// ----------------------------------
// React Query client
// ----------------------------------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 phút
    },
  },
});

// ----------------------------------
// Temporary Bookings Page
// ----------------------------------
const BookingsPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Đặt phòng của tôi</h1>
      <p className="text-gray-600">Tính năng đang phát triển...</p>
    </div>
  </div>
);

// ----------------------------------
// App
// ----------------------------------
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* ================= PUBLIC ROUTES ================= */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/search" element={<HotelSearch />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* ================= PROTECTED ROUTES ================= */}
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

              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <Wishlist />
                  </ProtectedRoute>
                }
              />

              {/* ================= 404 ================= */}
              <Route path="*" element={<NotFound />} />
            </Routes>

            {/* Global Chatbot */}
            <Chatbot />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
