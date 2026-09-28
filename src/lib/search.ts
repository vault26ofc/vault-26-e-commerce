import { supabase } from '@/integrations/supabase/client';

/** Characters that would break a PostgREST or() filter (commas, parentheses, wildcards) become spaces. */
export function cleanSearchTerm(raw: string): string {
  return raw.replace(/[,()%*\\"]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** or() filter: name/description contain the phrase, all words appear in the name, or the product's category/brand matches. */
export function searchOrClause(term: string, categoryIds: string[], brandIds: string[], productIds: string[] = []): string {
  const parts = [`name.ilike.%${term}%`, `description.ilike.%${term}%`];
  const words = term.split(' ').filter((w) => w.length > 1);
  if (words.length > 1) parts.push(`and(${words.map((w) => `name.ilike.%${w}%`).join(',')})`);
  if (categoryIds.length) parts.push(`category_id.in.(${categoryIds.join(',')})`);
  if (brandIds.length) parts.push(`brand_id.in.(${brandIds.join(',')})`);
  if (productIds.length) parts.push(`id.in.(${productIds.join(',')})`);
  return parts.join(',');
}

/** Builds the full product search filter, looking up categories and brands whose names match. */
export async function productSearchFilter(raw: string): Promise<string | null> {
  const term = cleanSearchTerm(raw);
  if (!term) return null;
  const [{ data: cats }, { data: brands }] = await Promise.all([
    supabase.from('categories').select('id').eq('is_active', true).ilike('name', `%${term}%`),
    supabase.from('brands').select('id').eq('is_active', true).ilike('name', `%${term}%`),
  ]);
  const catIds = (cats || []).map((c) => c.id);
  // Products listed under a matching category as an extra category.
  const { data: extra } = catIds.length
    ? await supabase.from('product_categories').select('product_id').in('category_id', catIds)
    : { data: [] as { product_id: string }[] };
  return searchOrClause(term, catIds, (brands || []).map((b) => b.id), [...new Set((extra || []).map((e) => e.product_id))]);
}
