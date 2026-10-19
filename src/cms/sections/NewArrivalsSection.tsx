import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import type { CMSSection, NewArrivalsConfig } from '../types';
import { useSectionProducts, toProductCard, PRODUCT_CARD_SELECT, type ProductPickConfig } from '../lib/sectionProducts';
import { resolveHref, type LinkValue } from '@/lib/links';

export default function NewArrivalsSection({ section }: { section: CMSSection }) {
  const cfg = section.config as NewArrivalsConfig & ProductPickConfig & { cta_link?: LinkValue };
  const { products: loaded } = useSectionProducts(cfg, async () => {
    const { data } = await supabase.from('products').select(PRODUCT_CARD_SELECT).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(cfg.product_count || 4);
    return (data || []).map((p) => ({ ...toProductCard(p), isNew: true }));
  }, [cfg.product_count]);
  const products = loaded;

  const displayProducts = products;
  if (!displayProducts.length) return null;

  return (
    <section className="py-10 md:py-14 bg-white text-black font-sans w-full border-t border-black/5">
      {/* Edge to Edge Container with Small Padding */}
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Section Header (Daily Paper Style) */}
        <div className="mb-5 md:mb-7 text-left px-1">
          <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-wide text-black leading-tight">
            {cfg.title}
          </h2>
          <p className="text-xs md:text-sm font-sans font-[800] uppercase text-black/80 tracking-wide mt-0.5">
            {cfg.subtitle || cfg.eyebrow}
          </p>
        </div>

        {/* Edge-to-Edge 4-Column Grid with Micro Gap Between Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3">
          {displayProducts.slice(0, cfg.product_count || 4).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>

        {/* Centered Outline SHOP NOW Button */}
        <div className="pt-10 md:pt-14 text-center">
          <Link
            to={resolveHref(cfg.cta_link ?? cfg.cta_href, "/shop")}
            className="inline-block border border-black text-black hover:bg-black hover:text-white px-9 py-3.5 text-xs font-sans font-bold tracking-[0.2em] uppercase transition-all duration-300 rounded-none shadow-none cursor-pointer"
          >
            {cfg.cta_label}
          </Link>
        </div>
      </div>
    </section>
  );
}

