import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProductCardData } from '@/components/product/ProductCard';

export const FALLBACK_PRODUCTS: ProductCardData[] = [
  { id: 'fb-1', slug: 'aop-boxy-camo-zip-up-hoodie', name: 'AOP Boxy Camo Zip Up Hoodie', images: ['/camo_zip_up_hoodie.png', '/camo_zip_up_hoodie_back.png'], price: 7490, comparePrice: 12490 },
  { id: 'fb-2', slug: 'kalamata-dias-stacked-cap', name: 'Kalamata Dias Stacked Cap', images: ['/kalamata_stacked_cap.png', '/kalamata_stacked_cap_back.png'], price: 2490 },
  { id: 'fb-3', slug: 'off-white-closed-shield-knit-sweater', name: 'Off White Closed Shield Knit Sweater', images: ['/off_white_knit_sweater.png', '/off_white_knit_sweater_back.png'], price: 7990 },
  { id: 'fb-4', slug: 'black-camo-t-shirt', name: 'Black Camo T-Shirt', images: ['/black_camo_tshirt.png', '/black_camo_tshirt_back.png'], price: 3490 },
];

/** Active catalogue products mapped to card data, with a static fallback. */
export function useShopProducts(limit = 8) {
  const [products, setProducts] = useState<ProductCardData[]>(FALLBACK_PRODUCTS);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('products')
      .select('id, slug, name, images, product_variants(price, compare_price)')
      .eq('is_active', true)
      .limit(limit)
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return;
        setProducts(
          data.map((p: any) => {
            const v = p.product_variants?.[0];
            return {
              id: p.id,
              slug: p.slug,
              name: p.name,
              images: Array.isArray(p.images) && p.images.length ? p.images : FALLBACK_PRODUCTS[0].images,
              price: Number(v?.price || 0),
              comparePrice: v?.compare_price ? Number(v.compare_price) : null,
            };
          }),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return products;
}
