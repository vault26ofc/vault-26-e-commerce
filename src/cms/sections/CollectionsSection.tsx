import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import type { CMSSection } from '../types';

const FALLBACK_NEW_COLLECTIONS: ProductCardData[] = [
  {
    id: 'nc-1',
    slug: 'french-linen-pleated-trousers',
    name: 'FRENCH LINEN PLEATED TROUSERS',
    images: [
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=90&w=800',
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=90&w=800'
    ],
    price: 5490,
    comparePrice: 6490,
    brand: 'VAULT 26',
    isNew: true
  },
  {
    id: 'nc-2',
    slug: 'relaxed-resort-linen-shirt',
    name: 'RELAXED RESORT LINEN SHIRT',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=90&w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=90&w=800'
    ],
    price: 4290,
    comparePrice: 4990,
    brand: 'VAULT 26',
    isNew: true
  },
  {
    id: 'nc-3',
    slug: 'unstructured-raw-linen-blazer',
    name: 'UNSTRUCTURED RAW LINEN BLAZER',
    images: [
      'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&q=90&w=800',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=90&w=800'
    ],
    price: 8990,
    comparePrice: 10990,
    brand: 'VAULT 26',
    isNew: true
  },
  {
    id: 'nc-4',
    slug: 'italian-leather-atelier-loafer',
    name: 'ITALIAN LEATHER ATELIER LOAFER',
    images: [
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=90&w=800',
      'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&q=90&w=800'
    ],
    price: 9490,
    comparePrice: 11990,
    brand: 'VAULT 26',
    isNew: true
  }
];

export default function CollectionsSection({ section: _section }: { section?: CMSSection }) {
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    supabase
      .from('products')
      .select('id, slug, name, images, brands(name), product_variants(price, compare_price)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => {
        const loaded = (data || []).map((p: any) => {
          const variants = p.product_variants || [];
          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            images: Array.isArray(p.images) && p.images.length > 0 ? p.images : ['/camo_zip_up_hoodie.png'],
            price: Number(variants[0]?.price || 0),
            comparePrice: variants[0]?.compare_price ? Number(variants[0].compare_price) : null,
            brand: p.brands?.name || 'VAULT 26',
            isNew: true,
          };
        });

        if (loaded.length > 0) {
          setProducts(loaded);
        } else {
          setProducts(FALLBACK_NEW_COLLECTIONS);
        }
      })
      .catch(() => {
        setProducts(FALLBACK_NEW_COLLECTIONS);
      });
  }, []);

  const displayProducts = products.length > 0 ? products : FALLBACK_NEW_COLLECTIONS;

  return (
    <section className="py-10 md:py-14 bg-white text-black font-sans w-full border-t border-black/5">
      {/* Edge to Edge Container with Small Padding */}
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Section Header (Daily Paper Style) */}
        <div className="mb-5 md:mb-7 text-left px-1">
          <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-wide text-black leading-tight">
            NEW COLLECTION
          </h2>
          <p className="text-xs md:text-sm font-sans font-normal uppercase text-black/80 tracking-wide mt-0.5">
            SEASONAL ARCHIVE 01
          </p>
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
            to="/shop?filter=new"
            className="inline-block border border-black text-black hover:bg-black hover:text-white px-9 py-3.5 text-xs font-sans font-bold tracking-[0.2em] uppercase transition-all duration-300 rounded-none shadow-none cursor-pointer"
          >
            VIEW ALL COLLECTIONS
          </Link>
        </div>
      </div>
    </section>
  );
}

