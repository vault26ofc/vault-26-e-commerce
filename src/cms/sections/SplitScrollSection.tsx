import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { CMSSection } from '../types';
import ProductCard from '@/components/product/ProductCard';
import { useShopProducts } from '@/components/polka/useShopProducts';
import { RedTag, SeeAll, TextColumns } from '@/components/polka/Polka';

/*
 * Polka double scroll (video 5): the left half is pinned Editor's Red with a
 * giant white phrase that slides sideways as you scroll; the right half is a
 * normal scrolling product column.
 */
export default function SplitScrollSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as { phrase?: string; caption?: string; title?: string };
  const phrase = cfg.phrase || 'Wear what matters · New season · ';
  const products = useShopProducts(8);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-66%']);

  return (
    <section ref={ref} className="relative bg-white md:grid md:grid-cols-2">
      {/* Pinned red panel */}
      <div className="relative md:sticky md:top-0 h-[46vh] md:h-screen bg-[#BB0006] overflow-hidden isolate">
        <TextColumns count={6} color="rgba(0,0,0,0.22)" className="hidden md:grid absolute inset-0 p-4 opacity-80" />
        <div className="absolute inset-0 flex items-center overflow-hidden">
          <motion.p
            style={{ x }}
            className="font-display font-[800] uppercase text-white whitespace-nowrap leading-[0.8] text-[34vw] md:text-[clamp(160px,34vh,360px)] pl-[4%] will-change-transform"
          >
            {phrase.repeat(3)}
          </motion.p>
        </div>
        <p className="absolute left-5 md:left-8 bottom-6 md:bottom-10 max-w-[320px] font-sans text-white text-[13px] md:text-[14px] leading-relaxed">
          — {cfg.caption || 'Independent cuts, heavyweight fabrics and pieces that stay in your rotation for years.'}
        </p>
      </div>

      {/* Scrolling product column */}
      <div className="px-4 sm:px-6 md:px-8 lg:px-[30px] py-12 md:py-[min(10vh,96px)]">
        <div className="flex items-end justify-between gap-4 mb-8">
          <RedTag>{cfg.title || 'The edit'}</RedTag>
          <SeeAll to="/shop">View all</SeeAll>
        </div>
        <div className="grid grid-cols-2 gap-x-3 md:gap-x-4 gap-y-10">
          {products.slice(0, 8).map((p, i) => (
            <div key={p.id} className={i % 4 === 1 ? 'md:mt-24' : undefined}>
              <ProductCard p={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
