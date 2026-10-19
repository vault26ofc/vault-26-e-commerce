import { useEffect, useState } from 'react';
import { PromoTile, SectionHead, Wrap } from '@/components/polka/Polka';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/product/ProductCard';
import type { CMSSection, BestSellersConfig } from '../types';
import { useSectionProducts, toProductCard, PRODUCT_CARD_SELECT, type ProductPickConfig } from '../lib/sectionProducts';
import { resolveHref, type LinkValue } from '@/lib/links';

export default function BestSellersSection({ section }: { section: CMSSection }) {
  const cfg = section.config as BestSellersConfig & ProductPickConfig & { cta_link?: LinkValue };
  const { products } = useSectionProducts(cfg, async () => {
    const { data } = await supabase.from('products').select(PRODUCT_CARD_SELECT).eq('is_active', true).limit(Math.max(cfg.product_count || 0, 6));
    return (data || []).map(toProductCard);
  }, [cfg.product_count]);

  const list = products;
  const [feature, side, ...rest] = list;
  const blurb = cfg.subtitle;
  if (!list.length) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <Wrap>
        <SectionHead title={cfg.title} to={cfg.cta_label ? resolveHref(cfg.cta_link ?? cfg.cta_href, '/shop') : undefined} linkLabel={cfg.cta_label} />

        {/* Mobile: swipe row */}
        <div className="md:hidden -mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          {list.slice(0, 6).map((p) => (
            <div key={p.id} className="snap-start shrink-0 w-[62%]">
              <ProductCard p={p} />
            </div>
          ))}
        </div>
        {blurb && <p className="md:hidden font-sans text-[14px] leading-relaxed text-[#0F0F0F] mt-5">{blurb}</p>}

        {/* Desktop: Polka asymmetric grid */}
        <div className="hidden md:grid grid-cols-4 gap-x-3 lg:gap-x-4 gap-y-10">
          {feature && (
            <div className="col-span-2 row-span-2">
              <ProductCard p={feature} large />
            </div>
          )}
          <PromoTile className="col-start-3 row-start-1" />
          <div className="col-start-4 row-start-1">{side && <ProductCard p={side} />}</div>
          <p className="col-start-3 col-span-2 self-end font-sans text-[15px] leading-relaxed text-[#0F0F0F] max-w-[520px] pb-14">
            {blurb}
          </p>
          {rest.slice(0, 3).map((p, i) => (
            <div key={p.id} className={i === 0 ? 'col-start-1' : i === 1 ? 'col-start-3' : 'col-start-4'}>
              <ProductCard p={p} />
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
