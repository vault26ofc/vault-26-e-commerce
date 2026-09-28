/** A link chosen in the admin by picking — never typed. Legacy configs may still hold a plain string. */
export type LinkTarget = { type: 'product' | 'category' | 'page'; value: string; label?: string };
export type LinkValue = LinkTarget | string | null | undefined;

/** Fixed storefront pages an admin can link to. Keep in sync with routes in App.tsx. */
export const PAGES: { value: string; label: string }[] = [
  { value: '/', label: 'Home' },
  { value: '/shop', label: 'Shop all' },
  { value: '/accessories', label: 'Accessories' },
  { value: '/lookbook', label: 'Lookbook' },
  { value: '/wishlist', label: 'Wishlist' },
  { value: '/account', label: 'My account' },
  { value: '/orders', label: 'My orders' },
];

export function resolveHref(v: LinkValue, fallback = '/'): string {
  if (!v) return fallback;
  if (typeof v === 'string') return v || fallback;
  if (!v.value) return fallback;
  if (v.type === 'product') return `/products/${v.value}`;
  if (v.type === 'category') return `/category/${v.value}`;
  return v.value;
}
