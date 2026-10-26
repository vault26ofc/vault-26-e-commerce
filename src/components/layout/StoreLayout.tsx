import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import WhatsAppButton from '@/components/shared/WhatsAppButton';
import CartDrawer from '@/components/cart/CartDrawer';
import AnnouncementBar from '@/components/cms/AnnouncementBar';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export default function StoreLayout() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    // overflow-x: clip — nothing wider than the screen can widen the page on phones (which zooms out
    // and slices the navbar and tab bar). Unlike hidden, clip keeps sticky sections working.
    <div className="min-h-screen flex flex-col [overflow-x:clip]">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">
        <motion.div
          key={loc.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
      <Footer />
      <BottomNav />
      <WhatsAppButton />
      <CartDrawer />
    </div>
  );
}
