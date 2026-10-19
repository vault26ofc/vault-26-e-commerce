import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProductCardData } from '@/components/product/ProductCard';
import { fetchPickedProducts, isManual, PRODUCT_CARD_SELECT, toProductCard, type ProductPickConfig } from '@/cms/lib/sectionProducts';

/**
 * Active catalogue products mapped to card data (newest first). When the section's admin config
 * says "Pick products", exactly those products are shown, in the picked order. No built-in
 * placeholders: an empty catalogue shows nothing.
 */
export function useShopProducts(limit = 8, pick: ProductPickConfig = {}) {
  const [products, setProducts] = useState<ProductCardData[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (isManual(pick)) {
      fetchPickedProducts(pick.product_slugs!).then((list) => { if (!cancelled) setProducts(list); });
      return () => { cancelled = true; };
    }
    supabase
      .from('products')
      .select(PRODUCT_CARD_SELECT)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .order('id')
      .limit(limit)
      .then(({ data }) => {
        if (!cancelled) setProducts((data || []).map(toProductCard));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, pick.product_mode, (pick.product_slugs || []).join(',')]);

  return products;
}
