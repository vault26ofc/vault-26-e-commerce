import { describe, it, expect } from 'vitest';
import { orderBySlugs, toProductCard, isManual } from './sectionProducts';

describe('orderBySlugs', () => {
  it('keeps the admin-picked order and drops missing products', () => {
    const rows = [{ slug: 'b' }, { slug: 'a' }, { slug: 'c' }];
    expect(orderBySlugs(rows, ['c', 'x', 'a']).map((r) => r.slug)).toEqual(['c', 'a']);
  });
});

describe('toProductCard', () => {
  it('uses the cheapest variant and brand, with a fallback brand', () => {
    const card = toProductCard({ id: '1', slug: 's', name: 'N', images: ['i.jpg'], brands: null,
      product_variants: [{ price: '900', compare_price: null }, { price: '700', compare_price: '1000' }] });
    expect(card).toMatchObject({ id: '1', slug: 's', name: 'N', images: ['i.jpg'], price: 700, comparePrice: 1000, brand: 'VAULT 26' });
  });
});

describe('isManual', () => {
  it('is manual only when chosen and at least one product is picked', () => {
    expect(isManual({ product_mode: 'manual', product_slugs: ['a'] })).toBe(true);
    expect(isManual({ product_mode: 'manual', product_slugs: [] })).toBe(false);
    expect(isManual({ product_slugs: ['a'] })).toBe(false);
  });
});
