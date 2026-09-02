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

          {settings.content_type === 'text' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.03 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            >
              <h2
                className="text-[80vw] font-bold"
                style={{ fontFamily: 'Playfair Display, serif', color: settings.text_color }}
              >
                {settings.content_text}
              </h2>
            </motion.div>
          ) : (
            settings.content_image_url && (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                src={settings.content_image_url}
                alt=""
                className="relative max-w-[60vw] max-h-[40vh] object-contain"
              />
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
