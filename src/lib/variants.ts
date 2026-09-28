export type EditorVariant = {
  id?: string;
  size: string;
  color: string;
  color_hex: string;
  price: number;
  compare_price: number | null;
  stock: number;
  /** Stock when the editor loaded it; the server applies the difference, so concurrent orders aren't overwritten. */
  original_stock?: number;
  sku: string;
};
export type Colour = { name: string; hex: string };

const key = (size: string, color: string) => `${size.trim().toLowerCase()}|${color.trim().toLowerCase()}`;

/** Every size × colour combination; existing variants are kept as they are (id, price, stock). */
export function buildVariantMatrix(
  sizes: string[], colours: Colour[], existing: EditorVariant[], defaults: { price: number; stock: number },
): EditorVariant[] {
  const byKey = new Map(existing.map((v) => [key(v.size, v.color), v]));
  const sizeList = sizes.length ? sizes : [''];
  const colourList: Colour[] = colours.length ? colours : [{ name: '', hex: '' }];
  const out: EditorVariant[] = [];
  for (const size of sizeList) {
    for (const c of colourList) {
      const found = byKey.get(key(size, c.name));
      out.push(found
        ? { ...found, size, color: c.name, color_hex: c.hex || found.color_hex }
        : { size, color: c.name, color_hex: c.hex, price: defaults.price, compare_price: null, stock: defaults.stock, sku: '' });
    }
  }
  return out;
}

export function duplicateVariantKeys(variants: EditorVariant[]): string[] {
  const first = new Map<string, EditorVariant>();
  const dup: string[] = [];
  for (const v of variants) {
    const k = key(v.size, v.color);
    const f = first.get(k);
    if (!f) { first.set(k, v); continue; }
    const label = `${f.size.trim() || 'One size'} / ${f.color.trim() || 'No colour'}`;
    if (!dup.includes(label)) dup.push(label);
  }
  return dup;
}
