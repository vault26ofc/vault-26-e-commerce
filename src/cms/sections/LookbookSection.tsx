import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { CMSSection } from '../types';

type Slide = {
  id: string;
  image_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  product_slug: string | null;
};

export default function LookbookSection({ section, isPage = false }: { section?: CMSSection; isPage?: boolean }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const heading = section?.config?.heading || 'VAULT 26 JOURNAL';
  const subtitle = section?.config?.subtitle || 'EDITORIAL & LOOKBOOK';

  useEffect(() => {
    supabase
      .from('lookbook_slides' as any)
      .select('id, image_url, media_type, caption, product_slug')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setSlides((data as unknown as Slide[]) || []))
      .catch((e) => console.warn('Lookbook slides error:', e));
  }, []);

  if (!slides.length) return null;

  return (
    <section className="py-12 md:py-20 bg-white text-black font-sans w-full border-t border-black/10">
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-10 md:mb-14 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/10 pb-6">
          <div>
            <span className="text-xs font-mono font-bold tracking-[0.2em] text-black/50 uppercase block mb-1">
              {subtitle}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-primary font-bold uppercase tracking-tight text-black leading-none">
              {heading}
            </h2>
          </div>
          {!isPage && (
            <Link
              to="/lookbook"
              className="text-xs font-bold tracking-[0.2em] uppercase text-black border-b-2 border-black pb-1 hover:text-black/60 hover:border-black/60 transition-colors inline-block w-fit"
            >
              EXPLORE ALL →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {slides.map((slide, i) => (
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.05 }}
              className="group"
            >
              <Link
                to={slide.product_slug ? `/products/${slide.product_slug}` : '/lookbook'}
                className="block"
              >
                <div className="aspect-[3/4] bg-[#F2F2F2] overflow-hidden mb-3">
                  {slide.media_type === 'video' ? (
                    <video
                      src={slide.image_url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={slide.image_url}
                      alt={slide.caption || ''}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  )}
                </div>
                {slide.caption && (
                  <p className="text-xs sm:text-sm text-black/70 leading-relaxed">{slide.caption}</p>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
