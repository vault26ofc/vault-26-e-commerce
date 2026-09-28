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

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=900`;

// Editorial fill so the spread never looks empty while the lookbook is still small.
const EDITORIAL_FILL: Slide[] = [
  { id: 'ed-1', image_url: U('photo-1485968579580-b6d095142e6e'), media_type: 'image', caption: 'City layers', product_slug: null },
  { id: 'ed-2', image_url: U('photo-1516826957135-700dedea698c'), media_type: 'image', caption: 'Off-duty denim', product_slug: null },
  { id: 'ed-3', image_url: U('photo-1509631179647-0177331693ae'), media_type: 'image', caption: 'Quiet tailoring', product_slug: null },
  { id: 'ed-4', image_url: U('photo-1520975954732-35dd22299614'), media_type: 'image', caption: 'Leather season', product_slug: null },
];

/*
 * Polka “space for reading” spread: oversized red title on the left, square
 * black-and-white frames on the right, each linking to the look it shows.
 */
export default function LookbookSection({ section, isPage = false }: { section?: CMSSection; isPage?: boolean }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const heading = section?.config?.heading || 'VAULT 26 JOURNAL';
  const subtitle = section?.config?.subtitle || 'EDITORIAL & LOOKBOOK';
  const cfg = (section?.config || {}) as { body?: string; cta_label?: string; cta_link?: LinkValue };

  useEffect(() => {
    supabase
      .from('lookbook_slides' as any)
      .select('id, image_url, media_type, caption, product_slug')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setSlides((data as unknown as Slide[]) || []), (e) => console.warn('Lookbook slides error:', e));
  }, []);

  const frames = isPage
    ? (slides.length ? slides : EDITORIAL_FILL)
    : [...slides, ...EDITORIAL_FILL].slice(0, 4);
  const title = heading.replace(/^VAULT 26\s*/i, '') || heading;

  return (
    <section className="bg-[#F1F1F1] py-16 md:py-24">
      <Wrap className="grid lg:grid-cols-[1fr_1.35fr] gap-10 lg:gap-16 items-start">
        <div className="lg:sticky lg:top-[100px]">
          <p className="font-sans uppercase text-[13px] text-[#0F0F0F]/60 mb-3">{subtitle}</p>
          <h2 className="font-display font-[800] uppercase text-[#BB0006] leading-[0.9] text-[clamp(56px,8vw,128px)]">
            {title}
          </h2>
          <p className="font-sans text-[15px] md:text-[16px] leading-relaxed text-[#0F0F0F] mt-6 max-w-[440px]">
            {cfg.body || 'Stories from the studio and the street. Every frame is styled from the current archive, and every piece in it is ready to shop.'}
          </p>
          {!isPage && (
            <Link to={resolveHref(cfg.cta_link, '/lookbook')} className="inline-flex mt-8 h-12 px-8 items-center bg-[#BB0006] text-white font-sans text-[15px] hover:bg-[#AA0001] transition-colors">
              {cfg.cta_label || 'Open the lookbook'}
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
