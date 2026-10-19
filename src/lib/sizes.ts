// Size order: a category's Admin → Sizes list first, then the conventional order below.
// Mirrors public.size_rank() in supabase/migrations/20261019010000_catalog_stock.sql.

export const ONE_SIZE = 'ONE SIZE';

/** True for the "no size" placeholder a single-size variant carries. */
export const isOneSize = (s: string | null | undefined) => !s || s.trim().toUpperCase() === ONE_SIZE;

const LETTER: Record<string, number> = {
  XXXS: 1, '3XS': 1, XXS: 2, '2XS': 2, XS: 3, S: 4, M: 5, L: 6, XL: 7, XXL: 8, '2XL': 8,
  XXXL: 9, '3XL': 9, '4XL': 10, '5XL': 11, 'ONE SIZE': 50, 'FREE SIZE': 50,
};

export function sizeRank(label: string): number {
  const s = (label || '').trim().toUpperCase();
  if (s in LETTER) return LETTER[s];
  if (/^\d{1,4}(\.\d+)?$/.test(s)) return 1000 + Math.trunc(Number(s) * 10);
  return 1_000_000;
}

/** Sorts size labels: positions in `order` (an Admin → Sizes list) first, then sizeRank, then A→Z. */
export function sortSizes(labels: string[], order: string[] = []): string[] {
  const pos = new Map(order.map((l, i) => [l.trim().toLowerCase(), i]));
  const at = (l: string) => pos.get(l.trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
  return [...labels].sort((a, b) => at(a) - at(b) || sizeRank(a) - sizeRank(b) || a.localeCompare(b));
}
