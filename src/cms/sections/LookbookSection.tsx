import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { CMSSection } from '../types';
import { Wrap } from '@/components/polka/Polka';
import { resolveHref, type LinkValue } from '@/lib/links';

type Slide = {
  id: string;
  image_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  product_slug: string | null;
};


/*
 * Polka “space for reading” spread: oversized red title on the left, square
 * black-and-white frames on the right, each linking to the look it shows.
 */
export default function LookbookSection({ section, isPage = false }: { section?: CMSSection; isPage?: boolean }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const heading = section?.config?.heading;
  const subtitle = section?.config?.subtitle;
  const cfg = (section?.config || {}) as { body?: string; cta_label?: string; cta_link?: LinkValue };

  useEffect(() => {
    supabase
      .from('lookbook_slides' as any)
      .select('id, image_url, media_type, caption, product_slug')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setSlides((data as unknown as Slide[]) || []), (e) => console.warn('Lookbook slides error:', e));
  }, []);

  const frames = isPage || !slides.length
    ? slides
    : Array.from({ length: 4 }, (_, i) => ({ ...slides[i % slides.length], id: `${slides[i % slides.length].id}-${i}` }));
  const title = (heading || '').replace(/^VAULT 26\s*/i, '') || heading || '';

  return (
    <section className="bg-[#F1F1F1] py-16 md:py-24">
      <Wrap className="grid lg:grid-cols-[1fr_1.35fr] gap-10 lg:gap-16 items-start">
        <div className="lg:sticky lg:top-[100px]">
          <p className="font-sans uppercase text-[13px] text-[#0F0F0F]/60 mb-3">{subtitle}</p>
          <h2 className="font-display font-[800] uppercase text-[#BB0006] leading-[0.9] text-[clamp(56px,8vw,128px)]">
            {title}
          </h2>
          <p className="font-sans text-[15px] md:text-[16px] leading-relaxed text-[#0F0F0F] mt-6 max-w-[440px]">
            {cfg.body}
          </p>
          {!isPage && (
            <Link to={resolveHref(cfg.cta_link, '/lookbook')} className="inline-flex mt-8 h-12 px-8 items-center bg-[#BB0006] text-white font-sans text-[15px] hover:bg-[#AA0001] transition-colors">
              {cfg.cta_label}
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {frames.map((slide, i) => {
            const href = slide.product_slug ? `/products/${slide.product_slug}` : '/lookbook';
            return (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.7, delay: (i % 2) * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={i % 2 === 1 ? 'md:mt-16' : undefined}
              >
                <Link to={href} className="group block">
                  <div className="aspect-square bg-white overflow-hidden">
                    {slide.media_type === 'video' ? (
                      <video src={slide.image_url} autoPlay muted loop playsInline className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-[1.03] transition-all duration-700" />
                    ) : (
                      <img src={slide.image_url} alt={slide.caption || ''} loading="lazy" className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-[1.03] transition-all duration-700" />
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-3 pt-3">
                    <p className="font-sans text-[14px] md:text-[15px] text-[#0F0F0F] truncate">{slide.caption || `Look ${i + 1}`}</p>
                    <span className="font-display font-[800] text-[#BB0006] text-[16px]">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </Wrap>
    </section>
  );
}
