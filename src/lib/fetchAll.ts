// Lists that can grow (orders, products, variants, customers, coupons, logs…) are read in pages:
// PostgREST returns at most "Max rows" (1000, Project Settings → Data API) per request, and a
// plain select silently stops there.

export const PAGE_SIZE = 1000;

type Result<T> = { data: T[] | null; error: unknown };
type Pageable<T> = { range: (from: number, to: number) => PromiseLike<Result<T>> };

/**
 * Every row of a query, 1000 at a time. `build` returns a fresh query each call and must have a
 * stable order ending in a unique column (`.order('created_at').order('id')`), or rows can repeat
 * or go missing between pages.
 */
export async function fetchAllRows<T = any>(build: () => Pageable<T>, pageSize = PAGE_SIZE): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data || [];
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
}

/** `.in(column, ids)` for long id lists: ids are de-duplicated and sent in chunks (URLs have a length limit). */
export async function fetchAllByIds<T = any>(
  ids: (string | null | undefined)[],
  build: (chunk: string[]) => Pageable<T>,
  chunkSize = 150,
): Promise<T[]> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  const out: T[] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    out.push(...(await fetchAllRows<T>(() => build(chunk))));
  }
  return out;
}
