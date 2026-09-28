import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import type { CMSSection } from '../types';
import { useShopProducts } from '@/components/polka/useShopProducts';
import { RedTag, SeeAll, TextColumns, Wrap } from '@/components/polka/Polka';
import { inr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { resolveHref, type LinkValue } from '@/lib/links';
import type { ProductPickConfig } from '@/cms/lib/sectionProducts';

type BentoConfig = ProductPickConfig & {
  title?: string; see_all_label?: string; see_all_link?: LinkValue;
  campaign_image?: string; campaign_title?: string; campaign_cta?: string; campaign_link?: LinkValue;
  offer_eyebrow?: string; offer_text?: string; offer_link?: LinkValue;
  stat_eyebrow?: string; stat_value?: string; stat_text?: string;
  lookbook_image?: string; lookbook_cta?: string; lookbook_link?: LinkValue;
  tile_image?: string; tile_label?: string; tile_link?: LinkValue;
  service_title?: string; service_text?: string;
};

const U = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=${w}`;

function Drift({ progress, speed, className, children }: { progress: MotionValue<number>; speed: number; className?: string; children: React.ReactNode }) {
  const y = useTransform(progress, [0, 1], [`${speed}%`, `${-speed}%`]);
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <motion.div style={{ y }} className="absolute inset-[-12%_0] will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

/*
 * Polka bento board as a shop: a 4×3 mosaic mixing campaign imagery (with
 * parallax), live products, a red statement tile, a drifting text tile and
 * an ink stats tile. Every tile is a door into the catalogue.
 */
export default function PolkaBentoSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as BentoConfig;
  const products = useShopProducts(6, cfg);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const [p1, p2, p3] = products;

  const productTile = (p: typeof p1 | undefined, cls: string) =>
    p && (
      <Link to={`/products/${p.slug}`} className={cn('group relative bg-[#F1F1F1] p-4 flex flex-col', cls)}>
        <div className="flex-1 min-h-0 overflow-hidden">
          <img src={p.images[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover mix-blend-multiply group-hover:scale-[1.04] transition-transform duration-700" />
        </div>
        <div className="pt-3 flex items-end justify-between gap-2 font-sans">
          <div className="min-w-0">
            <p className="text-[13px] md:text-[14px] text-[#0F0F0F] truncate">{p.name}</p>
            <p className="text-[14px] md:text-[15px] font-bold text-[#0F0F0F]">{inr(p.price)}</p>
          </div>
          <span className="text-[12px] uppercase text-[#BB0006] underline underline-offset-4 shrink-0">Shop</span>
        </div>
      </Link>
    );

  return (
    <section ref={ref} className="bg-white py-14 md:py-20">
      <Wrap>
        <div className="flex items-end justify-between gap-6 mb-6 md:mb-8">
          <RedTag>{cfg.title || 'The season board'}</RedTag>
          <SeeAll to={resolveHref(cfg.see_all_link, '/shop')}>{cfg.see_all_label || 'Shop everything'}</SeeAll>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[200px] md:auto-rows-[260px] gap-3 md:gap-4">
          {/* Big campaign */}
          <Link to={resolveHref(cfg.campaign_link, '/shop')} className="group col-span-2 row-span-2 relative">
            <Drift progress={scrollYProgress} speed={8} className="absolute inset-0">
              <img src={cfg.campaign_image || U('photo-1509631179647-0177331693ae', 1600)} alt={cfg.campaign_title || 'Autumn / Winter'} loading="lazy" className="w-full h-full object-cover grayscale" />
            </Drift>
            <div className="absolute left-4 bottom-4 md:left-6 md:bottom-6">
              <span className="bg-[#BB0006] text-white font-display uppercase text-[34px] md:text-[56px] leading-[0.95] px-[0.14em] pt-[0.08em] inline-block">{cfg.campaign_title || 'Autumn / Winter'}</span>
              <span className="mt-2 block font-sans text-white text-[14px] underline underline-offset-4">{cfg.campaign_cta || 'Shop the campaign'}</span>
            </div>
          </Link>

          {/* Red statement */}
          <Link to={resolveHref(cfg.offer_link, '/shop')} className="relative bg-[#BB0006] text-white p-5 flex flex-col justify-between overflow-hidden">
            <TextColumns count={4} color="rgba(0,0,0,0.22)" className="absolute inset-0 p-2" />
            <span className="relative font-sans uppercase text-[12px]">{cfg.offer_eyebrow || 'Members'}</span>
            <p className="relative font-display uppercase text-[40px] md:text-[54px] leading-[0.85]">{cfg.offer_text || '−15% on first order'}</p>
          </Link>

          {productTile(p1, 'row-span-2')}

          {/* Ink stats */}
          <div className="bg-[#0F0F0F] text-white p-5 flex flex-col justify-between">
            <span className="font-sans uppercase text-[12px] text-white/70">{cfg.stat_eyebrow || 'Since 2026'}</span>
            <div>
              <p className="font-display text-[64px] md:text-[80px] leading-none">{cfg.stat_value || '650+'}</p>
              <p className="font-sans text-[13px] text-white/80 mt-1">{cfg.stat_text || 'pieces made to outlive the season'}</p>
            </div>
          </div>

          {/* Wide lookbook */}
          <Link to={resolveHref(cfg.lookbook_link, '/lookbook')} className="group col-span-2 relative">
            <Drift progress={scrollYProgress} speed={14} className="absolute inset-0">
              <img src={cfg.lookbook_image || U('photo-1490481651871-ab68de25d43d', 1600)} alt="Lookbook" loading="lazy" className="w-full h-full object-cover grayscale" />
            </Drift>
            <span className="absolute right-4 bottom-4 bg-white text-[#BB0006] font-sans text-[14px] h-10 px-5 flex items-center">{cfg.lookbook_cta || 'Open the lookbook'}</span>
          </Link>

          {productTile(p2, '')}
          {productTile(p3, '')}

          {/* Portrait */}
          <Link to={resolveHref(cfg.tile_link, '/category/outerwear')} className="group relative row-span-1 md:row-span-1 col-span-2 md:col-span-1">
            <Drift progress={scrollYProgress} speed={10} className="absolute inset-0">
              <img src={cfg.tile_image || U('photo-1520975954732-35dd22299614', 900)} alt={cfg.tile_label || 'Outerwear'} loading="lazy" className="w-full h-full object-cover grayscale" />
            </Drift>
            <span className="absolute left-3 top-3 bg-[#BB0006] text-white font-display uppercase text-[26px] leading-none px-2 pt-1">{cfg.tile_label || 'Outerwear'}</span>
          </Link>

          {/* Services */}
          <div className="col-span-2 md:col-span-1 border border-[#0F0F0F] p-5 flex flex-col justify-between">
            <p className="font-display uppercase text-[#0F0F0F] text-[34px] leading-[0.9]">{cfg.service_title || 'Delivered in 3–5 days'}</p>
            <p className="font-sans text-[13px] text-[#0F0F0F]/80">{cfg.service_text || 'Free shipping over ₹999 · 7-day returns · COD available'}</p>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
