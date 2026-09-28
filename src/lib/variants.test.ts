import { describe, it, expect } from 'vitest';
import { buildVariantMatrix, duplicateVariantKeys, type EditorVariant } from './variants';

const base = { price: 1000, compare_price: null, stock: 0, sku: '' };

describe('buildVariantMatrix', () => {
  it('creates every size × colour combination with defaults', () => {
    const out = buildVariantMatrix(['S', 'M'], [{ name: 'Red', hex: '#f00' }, { name: 'Blue', hex: '#00f' }], [], { price: 999, stock: 3 });
    expect(out.map((v) => `${v.size}/${v.color}`)).toEqual(['S/Red', 'S/Blue', 'M/Red', 'M/Blue']);
    expect(out[0]).toMatchObject({ price: 999, stock: 3, color_hex: '#f00' });
    expect(out[0].id).toBeUndefined();
  });
  it('keeps existing variants (id, price, stock) matched case-insensitively', () => {
    const existing: EditorVariant[] = [{ id: 'v1', size: 's', color: 'red', color_hex: '#f00', ...base, price: 1500, stock: 7, original_stock: 7 }];
    const out = buildVariantMatrix(['S', 'M'], [{ name: 'Red', hex: '#f00' }], existing, { price: 999, stock: 0 });
    expect(out[0]).toMatchObject({ id: 'v1', price: 1500, stock: 7, original_stock: 7 });
    expect(out[1]).toMatchObject({ size: 'M', color: 'Red', price: 999 });
  });
  it('works with no colours (size-only products) and no sizes (one-size products)', () => {
    expect(buildVariantMatrix(['S', 'M'], [], [], { price: 1, stock: 0 }).map((v) => [v.size, v.color])).toEqual([['S', ''], ['M', '']]);
    expect(buildVariantMatrix([], [{ name: 'Black', hex: '#000' }], [], { price: 1, stock: 0 }).map((v) => [v.size, v.color])).toEqual([['', 'Black']]);
  });
});

describe('duplicateVariantKeys', () => {
  it('finds repeated size + colour pairs', () => {
    const v = (size: string, color: string): EditorVariant => ({ size, color, color_hex: '', ...base });
    expect(duplicateVariantKeys([v('M', 'Red'), v('m', 'red '), v('L', 'Red')])).toEqual(['M / Red']);
    expect(duplicateVariantKeys([v('M', 'Red'), v('L', 'Red')])).toEqual([]);
  });
});
