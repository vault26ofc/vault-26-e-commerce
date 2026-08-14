import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import WhatsAppButton from '@/components/shared/WhatsAppButton';
import CartDrawer from '@/components/cart/CartDrawer';
import AnnouncementBar from '@/components/cms/AnnouncementBar';
import FlagshipStoresSection from '@/cms/sections/FlagshipStoresSection';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export default function StoreLayout() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <FlagshipStoresSection />
      <Footer />
      <BottomNav />
      <WhatsAppButton />
      <CartDrawer />
    </div>
  );
}
