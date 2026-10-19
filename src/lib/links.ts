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

/** "@handle", "handle" or a full link → the Instagram profile URL (null when empty). */
export function instagramUrl(v?: string | null): string | null {
  const s = (v || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://instagram.com/${s.replace(/^@/, '').replace(/^instagram\.com\//i, '')}`;
}

/** A WhatsApp number ("98765 43210", "+91…") or wa.me link → chat URL (null when empty or too short). */
export function whatsappUrl(v?: string | null, text?: string): string | null {
  const s = (v || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const d = s.replace(/\D/g, '');
  if (d.length < 10) return null;
  return `https://wa.me/${d.length === 10 ? `91${d}` : d}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Any typed web address → an absolute URL (null when empty). */
export function externalUrl(v?: string | null): string | null {
  const s = (v || '').trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
