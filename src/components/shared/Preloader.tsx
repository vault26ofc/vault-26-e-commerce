import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface PreloaderProps {
  onComplete: () => void;
}

type Settings = {
  bg_type: 'color' | 'image' | 'video';
  bg_image_url: string | null;
  bg_video_url: string | null;
  content_type: 'text' | 'image';
  content_image_url: string | null;
  content_text: string;
  text_color: string;
  duration_ms: number;
};

const DEFAULTS: Settings = {
  bg_type: 'color',
  bg_image_url: null,
  bg_video_url: null,
  content_type: 'text',
  content_image_url: null,
  content_text: '26',
  text_color: '#000000',
  duration_ms: 1000,
};

export default function Preloader({ onComplete }: PreloaderProps) {
  const [isDone, setIsDone] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    supabase.from('preloader_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) setSettings({ ...DEFAULTS, ...(data as any) });
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDone(true);
      setTimeout(onComplete, 400);
    }, settings.duration_ms);
    return () => clearTimeout(timer);
  }, [onComplete, settings.duration_ms]);

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
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: settings.bg_type === 'color' ? '#ffffff' : undefined }}
        >
          {settings.bg_type === 'image' && settings.bg_image_url && (
            <img src={settings.bg_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {settings.bg_type === 'video' && settings.bg_video_url && (
            <video src={settings.bg_video_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.03 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          >
            <h2 className="text-[80vw] font-bold" style={{ fontFamily: 'Playfair Display, serif', color: settings.text_color }}>
              {settings.content_text}
            </h2>
          </motion.div>

          {settings.content_type === 'image' && settings.content_image_url ? (
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              src={settings.content_image_url}
              alt=""
              className="relative max-w-[60vw] max-h-[40vh] object-contain"
            />
          ) : (
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

              <div className="w-48 h-[1px] bg-black/15 mt-12 relative overflow-hidden">
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
                <p className="text-[10px] tracking-[0.6em] uppercase text-black/60 font-light font-ui">
                  Archive // established mmxxvi
                </p>
              </motion.div>
            </div>
          )}

          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, delay: 0.5 }} className="absolute top-12 left-12 w-24 h-[1px] bg-black/15" />
          <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1, delay: 0.5 }} className="absolute top-12 left-12 w-[1px] h-24 bg-black/15" />
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, delay: 0.5 }} className="absolute bottom-12 right-12 w-24 h-[1px] bg-black/15" />
          <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1, delay: 0.5 }} className="absolute bottom-12 right-12 w-[1px] h-24 bg-black/15" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
