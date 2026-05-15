import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDone(true);
      setTimeout(onComplete, 1200);
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.1,
            filter: 'blur(20px)',
            transition: { duration: 1, ease: [0.7, 0, 0.3, 1] }
          }}
          className="fixed inset-0 z-[9999] bg-white flex items-center justify-center overflow-hidden"
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.03 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          >
             <h2 className="text-[80vw] font-bold text-black" style={{ fontFamily: 'Playfair Display, serif' }}>26</h2>
          </motion.div>

          <div className="relative flex flex-col items-center">
            <div className="relative w-64 h-64 md:w-80 md:h-80 overflow-hidden">
              <motion.img
                src="https://res.cloudinary.com/dsqeawg67/image/upload/v1776861404/WhatsApp_Image_2026-04-21_at_23.40.39-removebg-preview_1_ztvyke.png"
                alt="VAULT 26"
                initial={{ y: '100%', opacity: 0, scale: 0.8 }}
                animate={{ 
                  y: '0%', 
                  opacity: 1, 
                  scale: 1,
                  transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] }
                }}
                className="w-full h-full object-contain brightness-0"
              />
            </div>

            <div className="w-48 h-[1px] bg-black/5 mt-12 relative overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: 2.5, ease: "easeInOut" }}
                className="absolute inset-0 bg-[#B11226]"
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="mt-6 overflow-hidden"
            >
              <p className="text-[10px] tracking-[0.6em] uppercase text-black/40 font-light font-ui">
                Archive // established mmxxvi
              </p>
            </motion.div>
          </div>

          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, delay: 0.5 }} className="absolute top-12 left-12 w-24 h-[1px] bg-black/10" />
          <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1, delay: 0.5 }} className="absolute top-12 left-12 w-[1px] h-24 bg-black/10" />
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, delay: 0.5 }} className="absolute bottom-12 right-12 w-24 h-[1px] bg-black/10" />
          <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1, delay: 0.5 }} className="absolute bottom-12 right-12 w-[1px] h-24 bg-black/10" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
