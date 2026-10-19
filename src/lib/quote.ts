import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CartLine } from './store';

// The server prices the bag (quote_order): subtotal → coupon → shipping → total, plus COD rules.
// The browser's own prices are only a placeholder while the quote loads.

export type QuoteLine = {
  variant_id: string; product_id: string; name: string; slug: string;
  size: string | null; color: string | null; image: string | null;
  price: number; quantity: number; amount: number;
};
export type QuoteProblem = { variant_id: string; reason: 'stock' | 'unavailable'; available: number; requested: number; name?: string };
export type QuoteCoupon = {
  ok: boolean; code: string; reason: string | null; message: string | null;
  discount: number; min_order?: number; covered?: number;
};
export type Quote = {
  lines: QuoteLine[];
  unavailable: QuoteProblem[];
  subtotal: number;
  coupon: QuoteCoupon | null;
  discount: number;
  shipping: number;
  shipping_fee: number;
  free_shipping_threshold: number;
  total: number;
  cod: { allowed: boolean; reason: 'disabled' | 'min_order' | null; min_order: number; advance_percent: number; advance: number };
};

export type AvailableCoupon = {
  code: string; kind: 'general' | 'welcome' | 'birthday'; personal: boolean;
  type: 'PERCENT' | 'FLAT'; value: number; max_discount: number | null; min_order: number;
  expires_at: string | null; first_order_only: boolean;
  ok: boolean; reason: string | null; message: string | null; discount: number;
};

export const cartPayload = (items: CartLine[]) => items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity }));

const num = (v: unknown) => Number(v) || 0;

function normalise(q: any): Quote {
  return {
    ...q,
    lines: (q.lines || []).map((l: any) => ({ ...l, price: num(l.price), amount: num(l.amount), quantity: num(l.quantity) })),
    unavailable: q.unavailable || [],
    subtotal: num(q.subtotal), discount: num(q.discount), shipping: num(q.shipping),
    shipping_fee: num(q.shipping_fee), free_shipping_threshold: num(q.free_shipping_threshold), total: num(q.total),
    coupon: q.coupon ? { ...q.coupon, discount: num(q.coupon.discount), min_order: num(q.coupon.min_order) } : null,
    cod: { ...q.cod, min_order: num(q.cod?.min_order), advance_percent: num(q.cod?.advance_percent), advance: num(q.cod?.advance) },
  };
}

export async function fetchQuote(items: CartLine[], couponCode: string | null, method: 'RAZORPAY' | 'COD' = 'RAZORPAY'): Promise<Quote> {
  const { data, error } = await supabase.rpc('quote_order' as any, {
    p_items: cartPayload(items), p_coupon_code: couponCode, p_payment_method: method,
  });
  if (error) throw error;
  return normalise(data);
}

/** Live server quote for the bag; re-fetched (debounced) whenever the bag, coupon or method changes. */
export function useQuote(items: CartLine[], couponCode: string | null, method: 'RAZORPAY' | 'COD' = 'RAZORPAY', refreshKey = 0) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const key = items.map((i) => `${i.variantId}:${i.quantity}`).join(',');
  useEffect(() => {
    if (!items.length) { setQuote(null); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      fetchQuote(items, couponCode, method)
        .then((q) => { if (!cancelled) setQuote(q); })
        .catch(() => { if (!cancelled) setQuote(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, couponCode, method, refreshKey]);
  return { quote, loading };
}

export async function fetchAvailableCoupons(items: CartLine[]): Promise<AvailableCoupon[]> {
  const { data, error } = await supabase.rpc('available_coupons' as any, { p_items: cartPayload(items) });
  if (error) throw error;
  return ((data as any[]) || []).map((c) => ({ ...c, value: num(c.value), min_order: num(c.min_order), discount: num(c.discount), max_discount: c.max_discount === null ? null : num(c.max_discount) }));
}

/** "10% off" / "₹200 off" (+ cap). */
export function couponOfferText(c: { type: string; value: number; max_discount?: number | null }, inr: (n: number) => string): string {
  const base = c.type === 'PERCENT' ? `${c.value}% off` : `${inr(c.value)} off`;
  return c.type === 'PERCENT' && c.max_discount ? `${base} (up to ${inr(c.max_discount)})` : base;
}

/** What to tell the shopper about a line that can't be bought as it is. */
export function problemText(p: QuoteProblem): string {
  if (p.reason === 'unavailable' || p.available <= 0) return 'Sold out — remove it to continue';
  return `Only ${p.available} left — reduce the quantity to continue`;
}
