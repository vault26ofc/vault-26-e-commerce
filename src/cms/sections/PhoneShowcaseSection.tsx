import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ChevronDown, ChevronLeft, Heart, Menu, Search, ShoppingBasket } from 'lucide-react';
import type { CMSSection } from '../types';
import type { ProductCardData } from '@/components/product/ProductCard';
import { useShopProducts } from '@/components/polka/useShopProducts';
import { TornEdge } from '@/components/polka/Polka';
import { inr } from '@/lib/format';
import { resolveHref, type LinkValue } from '@/lib/links';
import type { ProductPickConfig } from '@/cms/lib/sectionProducts';

const MODEL = 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&q=85&w=1400';
const CHIPS = ['All pieces', 'New', 'Bestsellers', 'Only here', 'Pre-order', 'Sale'];

/* A phone frame whose screen content scrolls with the page. */
function Phone({
  progress,
  travel,
  className,
  children,
}: {
  progress: MotionValue<number>;
  travel: string;
  className?: string;
  children: ReactNode;
}) {
  const y = useTransform(progress, [0, 1], ['0%', travel]);
  return (
    <div className={`absolute bg-[#0F0F0F] p-[5px] md:p-[9px] rounded-[26px] md:rounded-[42px] shadow-[0_30px_80px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="relative h-full w-full bg-white rounded-[22px] md:rounded-[34px] overflow-hidden">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[34%] h-[22px] bg-[#0F0F0F] rounded-full z-20" />
        <motion.div style={{ y }} className="will-change-transform">
          {children}
        </motion.div>
      </div>
    </div>
  );
}

function MiniCard({ p }: { p: ProductCardData }) {
  return (
    <Link to={`/products/${p.slug}`} className="block">
      <div className="relative bg-[#F1F1F1] aspect-[4/5] p-[9%]">
        <img src={p.images[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover mix-blend-multiply" />
        <Heart className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-[#0F0F0F]" strokeWidth={1.7} />
      </div>
      <div className="flex items-start justify-between gap-1 pt-1.5">
        <div className="min-w-0 font-sans">
          <p className="text-[10px] leading-tight text-[#0F0F0F] truncate">{p.name}</p>
          <p className="text-[11px] font-bold text-[#0F0F0F]">{inr(p.price)}</p>
        </div>
        <span className="shrink-0 w-5 h-5 border border-[#BB0006] text-[#BB0006] flex items-center justify-center">
          <ShoppingBasket className="w-3 h-3" strokeWidth={1.7} />
        </span>
      </div>
    </Link>
  );
}

function PhoneBar({ brand }: { brand: string }) {
  return (
    <div className="bg-[#BB0006] text-white h-[58px] pt-6 px-3 flex items-center justify-between">
      <Menu className="w-4 h-4" />
      <span className="font-display font-[800] uppercase text-[15px] leading-none">{brand}</span>
      <span className="flex gap-2"><Search className="w-4 h-4" /><ShoppingBasket className="w-4 h-4" /></span>
    </div>
  );
}

/*
 * Polka phones board (Behance module 11) as a shopping showcase: three phones
 * running the storefront around a full-length model. The section is tall and
 * pinned; scrolling drives each phone's screen at a different speed.
 */
export default function PhoneShowcaseSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as ProductPickConfig & {
    image?: string; brand?: string; screen_title?: string; chips?: string; cta_label?: string; cta_link?: LinkValue;
    email?: string; phone?: string; hours?: string;
  };
  const brand = cfg.brand || 'Vault 26';
  const chips = cfg.chips ? cfg.chips.split(',').map((c) => c.trim()).filter(Boolean) : CHIPS;
  const products = useShopProducts(12, cfg);
  const list = [...products, ...products, ...products].slice(0, 14);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  return (
    <section ref={ref} className="relative bg-[#BB0006] h-[320vh] overflow-clip">
      <TornEdge color="#FFFFFF" position="top" seed={113} />
      <img
        src="/hero_paper_texture.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-45 pointer-events-none"
      />
      {/* Full-length figure — twice the viewport tall, scrolls past the pinned phones */}
      <img
        src={cfg.image || MODEL}
        alt="Full-length look from the VAULT 26 archive"
        loading="lazy"
        className="absolute right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 top-[40vh] h-[230vh] w-[56vw] md:w-[30vw] object-cover object-[50%_20%] grayscale contrast-[1.1] pointer-events-none [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent),linear-gradient(to_bottom,black_88%,transparent)] [mask-composite:intersect]"
      />
      <div className="sticky top-0 h-screen overflow-hidden z-[2] pointer-events-none [&_a]:pointer-events-auto">

        <div className="relative mx-auto max-w-[1440px] h-full">
          {/* Phone 1 — catalogue */}
          <Phone progress={scrollYProgress} travel="-58%" className="left-[4%] md:left-[7%] top-[9%] w-[40%] sm:w-[30%] md:w-[19%] aspect-[9/19]">
            <PhoneBar brand={brand} />
            <div className="px-3 pt-2 font-sans">
              <p className="flex items-center gap-1 text-[10px] uppercase text-[#0F0F0F]/60"><ChevronLeft className="w-3 h-3" />Home</p>
              <p className="font-display font-[800] uppercase text-[#0F0F0F] text-[34px] leading-[0.85] mt-1">{cfg.screen_title || 'Shop all'}</p>
              <div className="grid grid-cols-3 gap-1 mt-2">
                {chips.map((c, i) => (
                  <span key={c} className={`h-6 flex items-center justify-center text-[9px] border ${i === 0 ? 'bg-[#BB0006] border-[#BB0006] text-white' : 'border-[#0F0F0F] text-[#0F0F0F]'}`}>{c}</span>
                ))}
              </div>
              <div className="flex justify-between border-y border-[#0F0F0F]/60 h-7 items-center mt-2 text-[9px] uppercase text-[#0F0F0F]">
                <span className="flex items-center gap-0.5">Filter <ChevronDown className="w-3 h-3" /></span>
                <span className="flex items-center gap-0.5">Popular <ChevronDown className="w-3 h-3" /></span>
              </div>
              {list[0] && <div className="mt-2"><MiniCard p={list[0]} /></div>}
              <div className="grid grid-cols-2 gap-2 mt-3 pb-6">
                {list.slice(1, 13).map((p, i) => <MiniCard key={`a-${i}`} p={p} />)}
              </div>
            </div>
          </Phone>

          {/* Phone 2 — product grid */}
          <Phone progress={scrollYProgress} travel="-48%" className="hidden sm:block right-[4%] md:right-[18%] top-[24%] w-[30%] md:w-[19%] aspect-[9/19]">
            <PhoneBar brand={brand} />
            <div className="px-3 pt-3">
              {list[3] && <MiniCard p={list[3]} />}
              <div className="grid grid-cols-2 gap-2 mt-3 pb-6">
                {list.slice(4, 14).map((p, i) => <MiniCard key={`b-${i}`} p={p} />)}
              </div>
            </div>
          </Phone>

          {/* Phone 3 — red footer menu */}
          <Phone progress={scrollYProgress} travel="-10%" className="hidden lg:block -right-[4%] top-[6%] w-[16%] aspect-[9/19]">
            <div className="bg-white pt-8 px-3 pb-3 font-sans">
              <p className="text-[10px] text-[#0F0F0F]">{list[0]?.name}</p>
              <p className="text-[12px] font-bold text-[#0F0F0F]">{list[0] ? inr(list[0].price) : ''}</p>
              <p className="text-center text-[11px] uppercase text-[#BB0006] underline underline-offset-2 mt-4">View more</p>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-[#0F0F0F]">
                <span className="w-5 h-5 bg-[#BB0006] text-white flex items-center justify-center">‹</span>1 2 3 4 5 … 12
                <span className="w-5 h-5 bg-[#BB0006] text-white flex items-center justify-center">›</span>
              </div>
            </div>
            <div className="relative bg-[#BB0006] text-white px-3 pt-6 pb-10 font-sans">
              <TornEdge color="#BB0006" position="top" seed={117} height="18px" className="!-translate-y-[95%] !rotate-0" />
              {['Customers', 'Navigation', 'Social'].map((h) => (
                <p key={h} className="flex items-center justify-between border-b border-white/60 h-9 text-[11px] uppercase">
                  {h} <ChevronDown className="w-3 h-3" />
                </p>
              ))}
              <p className="text-[12px] underline mt-4">{cfg.email || 'hello@vault26.co.in'}</p>
              <p className="text-[10px] mt-1">{cfg.phone || '+91 99999 99999'}</p>
              <p className="text-[10px]">{cfg.hours || 'Made in India · Mon–Sun 11–20'}</p>
              <p className="font-display font-[800] uppercase text-[46px] leading-[0.85] mt-4">{brand}</p>
              <p className="text-[8px] uppercase mt-3 leading-relaxed">© {brand}<br />Privacy policy<br />Terms of service</p>
            </div>
          </Phone>

          <Link
            to={resolveHref(cfg.cta_link, '/shop')}
            className="absolute left-[4%] md:left-auto md:right-[4%] bottom-[5%] z-10 h-12 px-8 bg-white text-[#BB0006] font-sans text-[15px] flex items-center hover:bg-[#F1F1F1] transition-colors"
          >
            {cfg.cta_label || 'Shop on any screen'}
          </Link>
        </div>
      </div>
      <TornEdge color="#FFFFFF" position="bottom" seed={119} />
    </section>
  );
}
