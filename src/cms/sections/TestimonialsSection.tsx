import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TornEdge, Wrap } from '@/components/polka/Polka';
import { useTestimonials } from '../hooks/useCMSPage';
import type { CMSSection, TestimonialsConfig, Testimonial } from '../types';

export default function TestimonialsSection({ section }: { section: CMSSection }) {
  const cfg = section.config as TestimonialsConfig & { body?: string; sort_label?: string };
  const { items: dbItems } = useTestimonials();
  const testimonials: Testimonial[] = dbItems || [];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = testimonials[i % testimonials.length];

  useEffect(() => {
    if (paused || testimonials.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % testimonials.length), 6000);
    return () => clearInterval(id);
  }, [paused, testimonials.length]);

  const go = (d: number) => setI((n) => (n + d + testimonials.length) % testimonials.length);
  // Only real reviews from Admin → CMS; none = no section.
  if (!t) return null;

  return (
    <section
      className="relative bg-[#BB0006] text-white mt-[clamp(30px,4vw,64px)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <TornEdge color="#BB0006" position="top" seed={101} className="!-translate-y-[98%] !rotate-0" />
      <Wrap className="py-14 md:py-20 grid md:grid-cols-[1fr_2fr] gap-10 md:gap-16">
        <div>
          <h2 className="font-display font-[800] uppercase text-[48px] md:text-[72px] leading-none">{cfg.heading}</h2>
          <p className="font-sans text-[15px] md:text-[16px] leading-relaxed mt-4 max-w-[360px]">
            {cfg.body}
          </p>
        </div>
        <div>
          <div className="border-y border-white/70 h-12 flex items-center justify-between font-sans uppercase text-[14px]">
            <span>{cfg.sort_label}</span>
            <span className="tabular-nums">{String((i % testimonials.length) + 1).padStart(2, '0')} / {String(testimonials.length).padStart(2, '0')}</span>
          </div>
          <div className="pt-8 min-h-[240px]">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/15 overflow-hidden shrink-0 flex items-center justify-center font-display font-[800] text-[28px]">
                  {t.avatar ? <img src={t.avatar} alt="" className="w-full h-full object-cover grayscale" /> : t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-sans font-bold uppercase text-[15px] md:text-[16px]">{t.name}</p>
                  <p className="text-[18px] tracking-[2px] leading-none mt-1" aria-label={`${t.rating || 5} out of 5`}>
                    {'★'.repeat(t.rating || 5)}
                    <span className="opacity-40">{'★'.repeat(5 - (t.rating || 5))}</span>
                  </p>
                  {t.role && <p className="font-sans text-[13px] text-white/80 mt-1.5">{t.role}</p>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => go(-1)} aria-label="Previous review" className="w-9 h-9 bg-white text-[#BB0006] flex items-center justify-center hover:bg-[#F1F1F1]">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => go(1)} aria-label="Next review" className="w-9 h-9 bg-white text-[#BB0006] flex items-center justify-center hover:bg-[#F1F1F1]">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="font-sans text-[16px] md:text-[18px] leading-relaxed mt-6 max-w-[680px]"
              >
                {t.body}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </Wrap>
      <TornEdge color="#FFFFFF" position="bottom" seed={103} />
    </section>
  );
}
