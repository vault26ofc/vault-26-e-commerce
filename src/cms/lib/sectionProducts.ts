import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProductCardData } from '@/components/product/ProductCard';

/** Columns every product-showing section needs to render a ProductCard. */
export const PRODUCT_CARD_SELECT = 'id, slug, name, images, created_at, brands(name), product_variants(price, compare_price, size, stock)';

/** Section config keys added by the CMS "Products" field. */
export type ProductPickConfig = { product_mode?: 'auto' | 'manual'; product_slugs?: string[] };

export const isManual = (cfg: ProductPickConfig) => cfg.product_mode === 'manual' && (cfg.product_slugs?.length ?? 0) > 0;

export function orderBySlugs<T extends { slug: string }>(rows: T[], slugs: string[]): T[] {
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs.map((s) => bySlug.get(s)).filter((r): r is T => !!r);
}

export function toProductCard(p: any): ProductCardData {
  const variants: any[] = p.product_variants || [];
  const cheapest = variants.reduce<any>((min, v) => (!min || Number(v.price) < Number(min.price) ? v : min), null);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    images: Array.isArray(p.images) ? p.images : [],
    price: Number(cheapest?.price || 0),
    comparePrice: cheapest?.compare_price ? Number(cheapest.compare_price) : null,
    brand: p.brands?.name || 'VAULT 26',
  };
}

/** Admin-picked products (in the picked order), only active ones. */
export async function fetchPickedProducts(slugs: string[]): Promise<ProductCardData[]> {
  const { data } = await supabase.from('products').select(PRODUCT_CARD_SELECT).eq('is_active', true).in('slug', slugs);
  return orderBySlugs((data || []) as any[], slugs).map(toProductCard);
}

/**
 * Products for a section: the admin's hand-picked list when the section is set to "Pick products",
 * otherwise the section's own automatic query. `auto` returns rows already shaped as ProductCardData.
 */
export function useSectionProducts(
  cfg: ProductPickConfig,
  auto: () => Promise<ProductCardData[]>,
  deps: unknown[] = [],
): { products: ProductCardData[]; loading: boolean } {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const key = isManual(cfg) ? `m:${cfg.product_slugs!.join(',')}` : 'auto';
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (isManual(cfg) ? fetchPickedProducts(cfg.product_slugs!) : auto())
      .then((list) => { if (!cancelled) setProducts(list); })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);
  return { products, loading };
}
