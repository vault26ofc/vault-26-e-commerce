// Pure Shiprocket helpers — no imports, so they run in Deno (edge functions) and Node (vitest).

export type Address = {
  full_name: string; phone: string; email?: string;
  line1: string; line2?: string | null; city: string; state: string; pincode: string;
};
export type ShipItem = {
  product_name: string; variant_label: string | null; variant_id: string | null;
  quantity: number; price_at_purchase: number | string;
};
export type ShipOrder = {
  order_number: string; created_at: string; email: string; shipping_address: Address;
  payment_method: string; total: number | string; cod_advance_amount: number | string | null;
  replacement_of: string | null;
};
export type Warehouse = {
  name: string; address: string; address_2?: string | null; city: string; state: string;
  country: string; pin_code: string | number; phone: string | number; email: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fixed box; 0.25 kg per unit, never below 0.5 kg. */
export function parcelFor(units: number) {
  return { length: 30, breadth: 25, height: 5, weight: Math.max(0.5, round2(units * 0.25)) };
}

export function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

/** What the courier collects in cash on a COD order: the balance after the online advance. */
export function codCollectable(o: { total: number | string; cod_advance_amount: number | string | null }) {
  return round2(Number(o.total) - (Number(o.cod_advance_amount) || 0));
}

/** Shiprocket wants a 10-digit Indian mobile. */
const phone10 = (p: string | number) => String(p).replace(/\D/g, '').slice(-10);

/** Shiprocket date format: "YYYY-MM-DD HH:mm" (UTC). */
const srDate = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');

const units = (items: ShipItem[]) => items.reduce((n, i) => n + i.quantity, 0);
const itemsValue = (items: ShipItem[]) => round2(items.reduce((n, i) => n + Number(i.price_at_purchase) * i.quantity, 0));
const srItems = (items: ShipItem[]) => items.map((i) => ({
  name: i.variant_label ? `${i.product_name} (${i.variant_label})` : i.product_name,
  sku: i.variant_id ?? i.product_name,
  units: i.quantity,
  selling_price: Number(i.price_at_purchase),
}));

export function buildForwardOrder(o: ShipOrder, items: ShipItem[], pickupLocation: string) {
  const a = o.shipping_address;
  const { first, last } = splitName(a.full_name);
  const isCod = o.payment_method === 'COD' && !o.replacement_of;
  const subTotal = o.replacement_of ? itemsValue(items) : isCod ? codCollectable(o) : round2(Number(o.total));
  return {
    order_id: o.order_number,
    order_date: srDate(new Date(o.created_at)),
    pickup_location: pickupLocation,
    billing_customer_name: first,
    billing_last_name: last,
    billing_address: a.line1,
    billing_address_2: a.line2 ?? '',
    billing_city: a.city,
    billing_pincode: a.pincode,
    billing_state: a.state,
    billing_country: 'India',
    billing_email: a.email || o.email,
    billing_phone: phone10(a.phone),
    shipping_is_billing: true,
    order_items: srItems(items),
    payment_method: isCod ? 'COD' : 'Prepaid',
    sub_total: subTotal,
    ...parcelFor(units(items)),
  };
}

export function buildReturnOrder(o: ShipOrder, items: ShipItem[], wh: Warehouse, now: Date) {
  const a = o.shipping_address;
  const { first, last } = splitName(a.full_name);
  return {
    order_id: `${o.order_number}-R`,
    order_date: srDate(now),
    pickup_customer_name: first,
    pickup_last_name: last,
    pickup_address: [a.line1, a.line2].filter(Boolean).join(', '),
    pickup_city: a.city,
    pickup_state: a.state,
    pickup_country: 'India',
    pickup_pincode: a.pincode,
    pickup_email: a.email || o.email,
    pickup_phone: phone10(a.phone),
    shipping_customer_name: wh.name,
    shipping_address: [wh.address, wh.address_2].filter(Boolean).join(', '),
    shipping_city: wh.city,
    shipping_state: wh.state,
    shipping_country: wh.country,
    shipping_pincode: String(wh.pin_code),
    shipping_email: wh.email,
    shipping_phone: phone10(wh.phone),
    order_items: srItems(items),
    payment_method: 'Prepaid',
    sub_total: itemsValue(items),
    ...parcelFor(units(items)),
  };
}

export type ShipmentEvent =
  | { kind: 'shipped' } | { kind: 'delivered' } | { kind: 'rto' }
  | { kind: 'return_in_transit' } | { kind: 'return_received' } | { kind: 'none' };

/** Maps a Shiprocket status string to what we do with the order. */
export function mapShipmentEvent(status: string, isReturn: boolean): ShipmentEvent {
  const s = (status || '').toUpperCase();
  if (!s) return { kind: 'none' };
  if (isReturn) {
    if (s.includes('DELIVERED')) return { kind: 'return_received' };
    if (/PICKED|TRANSIT|SHIPPED|OUT FOR|REACHED/.test(s)) return { kind: 'return_in_transit' };
    return { kind: 'none' };
  }
  if (s.includes('RTO')) return { kind: 'rto' };
  if (s.includes('DELIVERED')) return { kind: 'delivered' };
  if (/PICKED|TRANSIT|SHIPPED|OUT FOR|REACHED/.test(s)) return { kind: 'shipped' };
  return { kind: 'none' };
}

export function returnEligibility(
  o: { status: string; delivered_at: string | null; return_status: string; return_awb?: string | null; replacement_of: string | null },
  windowDays: number, now: Date,
): { ok: true } | { ok: false; error: string } {
  if (o.status !== 'DELIVERED' || !o.delivered_at) return { ok: false, error: 'Only delivered orders can be returned' };
  // A REQUESTED return with no AWB means booking the pickup failed — allow retrying it.
  const retryable = o.return_status === 'REQUESTED' && !o.return_awb;
  if (o.return_status !== 'NONE' && !retryable) return { ok: false, error: 'A return has already been requested for this order' };
  const ageDays = (now.getTime() - new Date(o.delivered_at).getTime()) / 86_400_000;
  if (ageDays > windowDays) return { ok: false, error: `The ${windowDays}-day return window has closed` };
  return { ok: true };
}
