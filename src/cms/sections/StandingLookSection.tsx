import { Link } from 'react-router-dom';
import type { CMSSection } from '../types';
import ProductCard from '@/components/product/ProductCard';
import { useShopProducts } from '@/components/polka/useShopProducts';
import { SeeAll, TornEdge } from '@/components/polka/Polka';
import { resolveHref, type LinkValue } from '@/lib/links';
import type { ProductPickConfig } from '@/cms/lib/sectionProducts';
import { Media } from '@/components/shared/Media';

const MODEL = 'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&q=85&w=1400';

/*
 * Polka “standing figure” board: a tall Editor's Red panel where a full-length
 * model stays pinned while a long white product column scrolls past.
 */
export default function StandingLookSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as ProductPickConfig & {
    image?: string; title?: string; see_all_label?: string; see_all_link?: LinkValue;
    cta_label?: string; cta_link?: LinkValue; headline_lines?: string; headline_highlight?: string;
  };
  const products = useShopProducts(12, cfg);
  const headline = (cfg.headline_lines || 'Built\nto be').split('\n');

  return (
    <section className="relative bg-[#BB0006] overflow-clip">
      <img
        src="/hero_paper_texture.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-40 pointer-events-none"
      />
      <TornEdge color="#FFFFFF" position="top" seed={71} />

      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-[30px] grid md:grid-cols-[minmax(0,420px)_1fr] gap-8 lg:gap-16 pt-[clamp(70px,8vw,120px)] pb-[clamp(70px,8vw,120px)]">
        {/* Long product column (the “phone”) */}
        <div className="bg-white p-3 md:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] order-2 md:order-1">
          <div className="flex items-center justify-between px-1 pb-3 mb-3 border-b border-[#0F0F0F]/15">
            <span className="font-display font-[800] uppercase text-[22px] leading-none text-[#0F0F0F]">{cfg.title || 'Complete the look'}</span>
            <SeeAll to={resolveHref(cfg.see_all_link, '/shop')}>{cfg.see_all_label || 'All'}</SeeAll>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6">
            {products.slice(0, 10).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>

        {/* Pinned standing model */}
        <div className="order-1 md:order-2 relative">
          <div className="md:sticky md:top-[62px] h-[70vh] md:h-[calc(100vh-62px)] flex flex-col items-center justify-end pb-4">
            <Media
              src={cfg.image || MODEL}
              alt="Full-length look from the VAULT 26 archive"
              loading="lazy"
              className="flex-1 min-h-0 w-auto max-w-full object-cover grayscale contrast-[1.15] mix-blend-multiply"
            />
            <Link to={resolveHref(cfg.cta_link, '/shop')} className="mt-4 w-full max-w-[420px] h-12 bg-white text-[#BB0006] font-sans text-[15px] flex items-center justify-center hover:bg-[#F1F1F1] transition-colors">
              {cfg.cta_label || 'Shop the full look'}
            </Link>
            <p className="absolute right-0 top-[10%] font-display font-[800] uppercase text-white text-right leading-[0.9] text-[clamp(40px,5.5vw,84px)]">
              {headline.map((l, i) => <span key={i}>{l}<br /></span>)}
              <span className="bg-white text-[#BB0006] px-[0.1em]">{cfg.headline_highlight || 'lived in'}</span>
            </p>
          </div>
        </div>
      </div>
      <TornEdge color="#FFFFFF" position="bottom" seed={77} />
    </section>
  );
}
