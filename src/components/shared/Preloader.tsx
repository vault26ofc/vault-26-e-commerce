import { useEffect, useState } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { TornEdge, TextColumns } from '@/components/polka/Polka';

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

const WORD = 'VAULT 26';
const EASE = [0.65, 0, 0.35, 1] as const;
// Long enough for the letters and counter to read, short enough not to annoy.
const MIN_MS = 1900;

/*
 * Polka loader: Editor's Red paper with drifting text columns, the wordmark
 * rising letter by letter, a 000→100 counter, then the whole sheet lifts
 * away with a torn bottom edge to reveal the page.
 */
export default function Preloader({ onComplete }: PreloaderProps) {
  const [isDone, setIsDone] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [count, setCount] = useState(0);
  const duration = Math.max(MIN_MS, settings.duration_ms);

  useEffect(() => {
    supabase.from('preloader_settings' as any).select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) setSettings({ ...DEFAULTS, ...(data as any) });
    });
  }, []);

  useEffect(() => {
    const controls = animate(0, 100, { duration: duration / 1000, ease: [0.4, 0, 0.2, 1], onUpdate: (v) => setCount(Math.round(v)) });
    const timer = setTimeout(() => {
      setIsDone(true);
      setTimeout(onComplete, 900);
    }, duration + 150);
    return () => {
      controls.stop();
      clearTimeout(timer);
    };
  }, [onComplete, duration]);

  const customBg = (settings.bg_type === 'image' && settings.bg_image_url) || (settings.bg_type === 'video' && settings.bg_video_url);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ y: '-110%', transition: { duration: 0.9, ease: EASE } }}
          className="fixed inset-0 z-[9999] overflow-visible text-white select-none"
          aria-label="Loading VAULT 26"
          role="status"
        >
          <div className="absolute inset-0 bg-[#BB0006] overflow-hidden">
            {settings.bg_type === 'image' && settings.bg_image_url && (
              <img src={settings.bg_image_url} alt="" className="absolute inset-0 w-full h-full object-cover grayscale mix-blend-multiply" />
            )}
            {settings.bg_type === 'video' && settings.bg_video_url && (
              <video src={settings.bg_video_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover grayscale mix-blend-multiply" />
            )}
            {!customBg && (
              <>
                <img src="/hero_paper_texture.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-40" />
                <TextColumns count={12} color="rgba(0,0,0,0.14)" className="absolute inset-0" />
              </>
            )}

            {/* Wordmark */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
              {settings.content_type === 'image' && settings.content_image_url ? (
                <motion.img
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: EASE }}
                  src={settings.content_image_url}
                  alt="VAULT 26"
                  className="max-w-[60vw] max-h-[40vh] object-contain"
                />
              ) : (
                <h1 className="font-display font-[800] uppercase leading-[0.85] text-[clamp(72px,17vw,280px)] flex" aria-label={WORD}>
                  {WORD.split('').map((ch, i) => (
                    <span key={i} className="inline-block overflow-hidden">
                      <motion.span
                        className="inline-block"
                        initial={{ y: '105%' }}
                        animate={{ y: '0%' }}
                        transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: EASE }}
                      >
                        {ch === ' ' ? ' ' : ch}
                      </motion.span>
                    </span>
                  ))}
                </h1>
              )}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-4 font-sans uppercase text-[12px] md:text-[14px] tracking-[0.04em]"
              >
                Online store · Archive 01 · 2026
              </motion.p>
            </div>

            {/* Counter + progress */}
            <div className="absolute left-4 right-4 md:left-8 md:right-8 bottom-10 md:bottom-12 flex items-end gap-6">
              <span className="font-display font-[800] tabular-nums leading-none text-[48px] md:text-[72px]">{String(count).padStart(3, '0')}</span>
              <div className="flex-1 h-[3px] bg-white/30 mb-3 md:mb-4">
                <div className="h-full bg-white" style={{ width: `${count}%` }} />
              </div>
            </div>
          </div>

          {/* Torn edge that leads the sheet away */}
          <TornEdge color="#BB0006" position="top" seed={151} height="clamp(30px,5vw,70px)" className="!top-auto !bottom-0 !translate-y-[97%] !rotate-0" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
