import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { CMSSection } from '../types';
import { useShopProducts } from '@/components/polka/useShopProducts';
import { SeeAll, TornEdge, Wrap, RedTag } from '@/components/polka/Polka';
import { useWishlist } from '@/lib/store';
import { inr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { resolveHref, type LinkValue } from '@/lib/links';
import type { ProductPickConfig } from '@/cms/lib/sectionProducts';

const BG = 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&q=85&w=2400';

/*
 * Polka “moving blocks” (video 3): compact white product tiles glide endlessly
 * across the lower half of a campaign photograph. Hover pauses the belt.
 */
export default function ProductMarqueeSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as ProductPickConfig & { title?: string; image?: string; see_all_label?: string; see_all_link?: LinkValue };
  const products = useShopProducts(12, cfg);
  const { ids, toggle } = useWishlist();
  const reps = Math.max(1, Math.ceil(10 / Math.max(products.length, 1)));
  const base = Array.from({ length: reps }, () => products).flat();
  const belt = [...base, ...base];

  return (
    <section className="relative bg-white">
      <div className="relative overflow-hidden h-[520px] md:h-[640px]">
        <img
          src={cfg.image || BG}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-[50%_30%]"
        />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-[#BB0006]/90" />
        <TornEdge color="#FFFFFF" position="top" seed={51} />

        <Wrap className="relative z-[3] pt-[clamp(56px,6vw,90px)] flex items-end justify-between gap-6">
          <RedTag>{cfg.title || 'Picked for you'}</RedTag>
          <span className="bg-white px-3 py-1.5"><SeeAll to={resolveHref(cfg.see_all_link, '/shop')}>{cfg.see_all_label || 'Shop all'}</SeeAll></span>
        </Wrap>

        <div className="absolute z-[3] left-0 right-0 bottom-[clamp(48px,6vw,88px)] overflow-hidden">
          <div className="polka-belt flex w-max gap-3 md:gap-4 px-2">
            {belt.map((p, i) => {
              const wished = ids.includes(p.id);
              return (
                <Link
                  key={`${p.id}-${i}`}
                  to={`/products/${p.slug}`}
                  style={{ width: 'clamp(150px, 13vw, 196px)' }}
                  className="relative shrink-0 bg-white p-2.5 md:p-3 block shadow-[0_8px_24px_rgba(0,0,0,0.22)] hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className="relative bg-[#F1F1F1] aspect-[4/5] overflow-hidden">
                    <img src={p.images[0]} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover mix-blend-multiply" />
                    <button
                      onClick={(e) => { e.preventDefault(); toggle(p.id); }}
                      aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                      className="absolute top-1.5 right-1.5 p-1 bg-white/85 text-[#0F0F0F] hover:text-[#BB0006]"
                    >
                      <Heart strokeWidth={1.7} className={cn('w-3.5 h-3.5', wished && 'fill-[#BB0006] stroke-[#BB0006]')} />
                    </button>
                  </div>
                  <p className="pt-2 font-sans text-[12px] text-[#0F0F0F] truncate">{p.name}</p>
                  <p className="font-sans text-[13px] font-bold text-[#0F0F0F]">{inr(p.price)}</p>
                </Link>
              );
            })}
          </div>
        </div>
        <TornEdge color="#FFFFFF" position="bottom" seed={57} />
      </div>
    </section>
  );
}
