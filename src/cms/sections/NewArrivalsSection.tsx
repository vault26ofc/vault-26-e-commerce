import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import type { CMSSection, NewArrivalsConfig } from '../types';

const FALLBACK_NEW_ARRIVALS: ProductCardData[] = [
  {
    id: 'na-1',
    slug: 'aop-boxy-camo-zip-up-hoodie',
    name: 'AOP BOXY CAMO ZIP UP HOODIE',
    images: [
      '/camo_zip_up_hoodie.png',
      '/camo_zip_up_hoodie.png'
    ],
    price: 7490,
    comparePrice: 12490,
    brand: 'VAULT 26',
    isNew: true
  },
  {
    id: 'na-2',
    slug: 'kalamata-dias-stacked-cap',
    name: 'KALAMATA DIAS STACKED CAP',
    images: [
      '/kalamata_stacked_cap.png',
      '/kalamata_stacked_cap.png'
    ],
    price: 2490,
    comparePrice: 4190,
    brand: 'VAULT 26',
    isNew: true,
    sizeLabel: 'One Size'
  },
  {
    id: 'na-3',
    slug: 'off-white-closed-shield-knit-sweater',
    name: 'OFF WHITE CLOSED SHIELD KNIT SWEATER',
    images: [
      '/off_white_knit_sweater.png',
      '/off_white_knit_sweater.png'
    ],
    price: 7990,
    comparePrice: 13290,
    brand: 'VAULT 26',
    isNew: true
  },
  {
    id: 'na-4',
    slug: 'black-camo-t-shirt',
    name: 'BLACK CAMO T-SHIRT',
    images: [
      '/black_camo_tshirt.png',
      '/black_camo_tshirt.png'
    ],
    price: 3490,
    comparePrice: 4990,
    brand: 'VAULT 26',
    isNew: true
  }
];

export default function NewArrivalsSection({ section }: { section: CMSSection }) {
  const cfg = section.config as NewArrivalsConfig;
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    supabase
      .from('products')
      .select('id, slug, name, images, brands(name), product_variants(price, compare_price)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(cfg.product_count || 4)
      .then(({ data }) => {
        const loaded = (data || []).map((p: any) => {
          const variants = p.product_variants || [];
          const price = Number(variants[0]?.price || 0);
          const comparePrice = variants[0]?.compare_price ? Number(variants[0].compare_price) : null;
          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            images: Array.isArray(p.images) && p.images.length > 0 ? p.images : ['/camo_zip_up_hoodie.png'],
            price: price,
            comparePrice: comparePrice,
            brand: p.brands?.name || 'VAULT 26',
            isNew: true,
          };
        });

        if (loaded.length > 0) {
          setProducts(loaded);
        } else {
          setProducts(FALLBACK_NEW_ARRIVALS);
        }
      })
      .catch(() => {
        setProducts(FALLBACK_NEW_ARRIVALS);
      });
  }, [cfg.product_count]);

  const displayProducts = products.length > 0 ? products : FALLBACK_NEW_ARRIVALS;

  return (
    <section className="py-10 md:py-14 bg-white text-black font-sans w-full border-t border-black/5">
      {/* Edge to Edge Container with Small Padding */}
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Section Header (Daily Paper Style) */}
        <div className="mb-5 md:mb-7 text-left px-1">
          <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-wide text-black leading-tight">
            {cfg.title || "NEW ARRIVALS"}
          </h2>
          <p className="text-xs md:text-sm font-sans font-normal uppercase text-black/80 tracking-wide mt-0.5">
            {cfg.subtitle || cfg.eyebrow || "FRESH DROPS"}
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
            to={cfg.cta_href || "/shop"}
            className="inline-block border border-black text-black hover:bg-black hover:text-white px-9 py-3.5 text-xs font-sans font-bold tracking-[0.2em] uppercase transition-all duration-300 rounded-none shadow-none cursor-pointer"
          >
            {cfg.cta_label || "SHOP NEW ARRIVALS"}
          </Link>
        </div>
      </div>
    </section>
  );
}

