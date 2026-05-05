import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import WhatsAppButton from '@/components/shared/WhatsAppButton';
import CartDrawer from '@/components/cart/CartDrawer';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export default function StoreLayout() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.main
          key={loc.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 pb-20 lg:pb-0"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
      <BottomNav />
      <WhatsAppButton />
      <CartDrawer />
    </div>
  );
}
