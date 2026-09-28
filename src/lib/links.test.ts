import { describe, it, expect } from 'vitest';
import { resolveHref, PAGES } from './links';

describe('resolveHref', () => {
  it('maps picked targets to storefront routes', () => {
    expect(resolveHref({ type: 'product', value: 'linen-shirt' })).toBe('/products/linen-shirt');
    expect(resolveHref({ type: 'category', value: 'shirts' })).toBe('/category/shirts');
    expect(resolveHref({ type: 'page', value: '/lookbook' })).toBe('/lookbook');
  });
  it('keeps legacy typed links working', () => expect(resolveHref('/shop')).toBe('/shop'));
  it('falls back when nothing is set', () => {
    expect(resolveHref(undefined, '/shop')).toBe('/shop');
    expect(resolveHref({ type: 'product', value: '' }, '/shop')).toBe('/shop');
    expect(resolveHref('')).toBe('/');
  });
  it('offers only real storefront pages', () => {
    expect(PAGES.map((p) => p.value)).toContain('/shop');
    expect(PAGES.every((p) => p.value.startsWith('/'))).toBe(true);
  });
});
