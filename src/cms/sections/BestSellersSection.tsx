import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import type { CMSSection, BestSellersConfig } from '../types';

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
  const cfg = section.config as BestSellersConfig;
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    supabase
      .from('products')
      .select('id, slug, name, images, brands(name), product_variants(price, compare_price)')
      .eq('is_active', true)
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
            images: Array.isArray(p.images) && p.images.length > 0 ? p.images : ['/camo_zip_up_hoodie.png', '/camo_zip_up_hoodie_back.png'],
            price: price,
            comparePrice: comparePrice,
            brand: p.brands?.name || 'VAULT 26',
          };
        });

        if (loaded.length > 0) {
          setProducts(loaded);
        } else {
          setProducts(FALLBACK_BEST_SELLERS);
        }
      })
      .catch(() => {
        setProducts(FALLBACK_BEST_SELLERS);
      });
  }, [cfg.product_count]);

  const displayProducts = products.length > 0 ? products : FALLBACK_BEST_SELLERS;

  return (
    <section className="py-10 md:py-14 bg-white text-black font-sans w-full border-t border-black/5">
      {/* Edge to Edge Container with Small Padding */}
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Section Header (Daily Paper Style: "SUMMER SALE / NOW LIVE") */}
        <div className="mb-5 md:mb-7 text-left px-1">
          <div className="overflow-hidden py-0.5">
            <motion.h2
              initial={{ opacity: 0, y: '100%' }}
              whileInView={{ opacity: 1, y: '0%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-xl md:text-2xl font-sans font-bold uppercase tracking-wide text-black leading-tight"
            >
              {cfg.title || "SUMMER SALE"}
            </motion.h2>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-xs md:text-sm font-sans font-normal uppercase text-black/80 tracking-wide mt-0.5"
          >
            {cfg.subtitle || "NOW LIVE"}
          </motion.p>
        </div>

        {/* Edge-to-Edge 4-Column Grid with Micro Gap Between Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3">
          {displayProducts.slice(0, 4).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>

        {/* Centered Outline SHOP NOW Button */}
        <div className="pt-10 md:pt-14 text-center">
          <Link
            to={cfg.cta_href || "/shop"}
            className="inline-block border border-black text-black hover:bg-black hover:text-white px-9 py-3.5 text-xs font-sans font-bold tracking-[0.2em] uppercase transition-all duration-300 rounded-none shadow-none cursor-pointer"
          >
            {cfg.cta_label || "SHOP NOW"}
          </Link>
        </div>
      </div>
    </section>
  );
}
