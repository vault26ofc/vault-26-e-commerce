import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, ShoppingBasket } from 'lucide-react';
import type { CMSSection } from '../types';
import { TornEdge, Wrap, TextColumns } from '@/components/polka/Polka';
import { useShopProducts } from '@/components/polka/useShopProducts';
import { inr } from '@/lib/format';
import { cn } from '@/lib/utils';

const LOOK = 'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&q=85&w=1600';

// Hotspot positions (% of the photo) — sunglasses, jacket, trousers, shoes.
const SPOTS = [
  { x: 52, y: 22 },
  { x: 44, y: 44 },
  { x: 60, y: 70 },
  { x: 46, y: 88 },
];

/*
 * Polka “shop the look”: a tall black-and-white editorial photo with red
 * hotspots on each garment. Picking a hotspot swaps the product card on the
 * right; the full look can be added in one go.
 */
export default function DropCountdownSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as { image?: string; title?: string };
  const products = useShopProducts(8);
  const pieces = products.slice(0, SPOTS.length);
  const [active, setActive] = useState(0);
  const current = pieces[active];
  const total = pieces.reduce((n, p) => n + p.price, 0);

  return (
    <section className="relative bg-[#0F0F0F] text-white overflow-hidden">
      <TornEdge color="#FFFFFF" position="top" seed={131} />
      <TextColumns count={12} color="rgba(255,255,255,0.06)" className="absolute inset-0" />
      <Wrap className="relative z-[3] py-[clamp(80px,9vw,140px)] grid lg:grid-cols-[1fr_1.1fr_1fr] gap-8 lg:gap-10 items-center">
        {/* Title + list */}
        <div>
          <p className="font-sans uppercase text-[13px] text-white/60">Look 07 · Archive 01</p>
          <h2 className="font-display font-[800] uppercase text-[clamp(52px,6.5vw,104px)] leading-[0.85] mt-2">
            {cfg.title || 'Shop the look'}
          </h2>
          <ol className="mt-8 border-t border-white/30">
            {pieces.map((p, i) => (
              <li key={p.id}>
                <button
                  onClick={() => setActive(i)}
                  className={cn(
                    'w-full h-12 flex items-center gap-4 border-b border-white/30 font-sans text-[15px] transition-colors px-2',
                    i === active ? 'bg-[#BB0006]' : 'hover:bg-white/5',
                  )}
                >
                  <span className="font-display font-[800] text-[18px] w-6">{String(i + 1).padStart(2, '0')}</span>
                  <span className="truncate flex-1 text-left">{p.name}</span>
                  <span className="font-bold">{inr(p.price)}</span>
                </button>
              </li>
            ))}
          </ol>
          <Link to="/shop" className="mt-6 inline-flex h-12 px-7 items-center bg-white text-[#BB0006] font-sans text-[15px] hover:bg-[#F1F1F1] transition-colors">
            Full look · {inr(total)}
          </Link>
        </div>

        {/* Photo with hotspots */}
        <div className="relative aspect-[3/4] bg-[#1A1A1A] overflow-hidden">
          <img src={cfg.image || LOOK} alt="Styled look" loading="lazy" className="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.1]" />
          {SPOTS.slice(0, pieces.length).map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Show ${pieces[i]?.name}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <span className={cn('absolute inset-0 rounded-full bg-[#BB0006] animate-ping', i !== active && 'opacity-0')} />
              <span
                className={cn(
                  'relative w-9 h-9 rounded-full flex items-center justify-center border-2 border-white transition-transform',
                  i === active ? 'bg-[#BB0006] scale-110' : 'bg-[#0F0F0F]/70 hover:bg-[#BB0006]',
                )}
              >
                <Plus className={cn('w-4 h-4 transition-transform', i === active && 'rotate-45')} strokeWidth={2.5} />
              </span>
            </button>
          ))}
        </div>

        {/* Active product */}
        <div className="relative min-h-[420px]">
          <AnimatePresence mode="wait">
            {current && (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white text-[#0F0F0F] p-4"
              >
                <div className="aspect-[4/5] bg-[#F1F1F1] overflow-hidden">
                  <img src={current.images[0]} alt={current.name} className="w-full h-full object-cover mix-blend-multiply" />
                </div>
                <p className="font-sans text-[15px] mt-3">{current.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-sans text-[20px] font-bold">{inr(current.price)}</span>
                  {current.comparePrice && current.comparePrice > current.price && (
                    <span className="font-sans text-[14px] text-[#0F0F0F]/40 line-through">{inr(current.comparePrice)}</span>
                  )}
                </div>
                <Link
                  to={`/products/${current.slug}`}
                  className="mt-4 h-12 w-full bg-[#BB0006] text-white font-sans text-[15px] flex items-center justify-center gap-2 hover:bg-[#AA0001] transition-colors"
                >
                  <ShoppingBasket className="w-4 h-4" /> Choose size
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Wrap>
      <TornEdge color="#FFFFFF" position="bottom" seed={137} />
    </section>
  );
}
