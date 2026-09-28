import { useEffect, useState } from 'react';
import { PromoTile, SectionHead, Wrap } from '@/components/polka/Polka';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import type { CMSSection, BestSellersConfig } from '../types';
import { useSectionProducts, toProductCard, PRODUCT_CARD_SELECT, type ProductPickConfig } from '../lib/sectionProducts';
import { resolveHref, type LinkValue } from '@/lib/links';

const FALLBACK_BEST_SELLERS: ProductCardData[] = [
  {
    id: 'bs-1',
    slug: 'aop-boxy-camo-zip-up-hoodie',
    name: 'AOP BOXY CAMO ZIP UP HOODIE',
    images: [
      '/camo_zip_up_hoodie.png',
      '/camo_zip_up_hoodie_back.png'
    ],
    price: 7490,
    comparePrice: 12490,
    brand: 'VAULT 26',
    isNew: false
  },
  {
    id: 'bs-2',
    slug: 'kalamata-dias-stacked-cap',
    name: 'KALAMATA DIAS STACKED CAP',
    images: [
      '/kalamata_stacked_cap.png',
      '/kalamata_stacked_cap_back.png'
    ],
    price: 2490,
    comparePrice: 4190,
    brand: 'VAULT 26',
    sizeLabel: 'One Size'
  },
  {
    id: 'bs-3',
    slug: 'off-white-closed-shield-knit-sweater',
    name: 'OFF WHITE CLOSED SHIELD KNIT SWEATER',
    images: [
      '/off_white_knit_sweater.png',
      '/off_white_knit_sweater_back.png'
    ],
    price: 7990,
    comparePrice: 13290,
    brand: 'VAULT 26',
  },
  {
    id: 'bs-4',
    slug: 'black-camo-t-shirt',
    name: 'BLACK CAMO T-SHIRT',
    images: [
      '/black_camo_tshirt.png',
      '/black_camo_tshirt_back.png'
    ],
    price: 3490,
    comparePrice: 4990,
    brand: 'VAULT 26',
  }
];

export default function BestSellersSection({ section }: { section: CMSSection }) {
  const cfg = section.config as BestSellersConfig & ProductPickConfig & { cta_link?: LinkValue };
  const { products } = useSectionProducts(cfg, async () => {
    const { data } = await supabase.from('products').select(PRODUCT_CARD_SELECT).eq('is_active', true).limit(Math.max(cfg.product_count || 0, 6));
    return (data || []).map(toProductCard);
  }, [cfg.product_count]);

  const list = products.length > 0 ? products : FALLBACK_BEST_SELLERS;
  const [feature, side, ...rest] = list;
  const blurb = cfg.subtitle || 'Fresh drops picked by the studio. Heavyweight cotton, washed denim and knitwear worth a place in your rotation.';

  return (
    <section className="bg-white py-14 md:py-20">
      <Wrap>
        <SectionHead title={cfg.title || 'New arrivals'} to={resolveHref(cfg.cta_link ?? cfg.cta_href, '/shop')} linkLabel={cfg.cta_label || 'View all'} />

        {/* Mobile: swipe row */}
        <div className="md:hidden -mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          {list.slice(0, 6).map((p) => (
            <div key={p.id} className="snap-start shrink-0 w-[62%]">
              <ProductCard p={p} />
            </div>
          ))}
        </div>
        <p className="md:hidden font-sans text-[14px] leading-relaxed text-[#0F0F0F] mt-5">{blurb}</p>

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
