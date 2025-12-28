import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturedProperties from "@/components/FeaturedProperties";
import Footer from "@/components/Footer";

const Index = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Jump instantly to the top of the page
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <FeaturedProperties />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
