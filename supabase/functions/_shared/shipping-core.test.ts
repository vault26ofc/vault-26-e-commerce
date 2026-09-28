// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parcelFor, splitName, codCollectable, buildForwardOrder, buildReturnOrder, mapShipmentEvent, returnEligibility } from './shipping-core.ts';

const address = { full_name: 'Asha Rao Kumar', phone: '+91 98123 45670', email: 'a@b.in', line1: '12 Beach Rd', line2: 'Flat 3', city: 'Visakhapatnam', state: 'Andhra Pradesh', pincode: '530017' };
const items = [
  { product_name: 'Linen Shirt', variant_label: 'M · Sand', variant_id: 'v1', quantity: 2, price_at_purchase: 1999 },
  { product_name: 'Tote', variant_label: null, variant_id: 'v2', quantity: 1, price_at_purchase: 999 },
];
const order = {
  order_number: 'V26-ABC', created_at: '2026-09-28T09:30:00Z', email: 'a@b.in', shipping_address: address,
  payment_method: 'RAZORPAY', total: 4997, discount: 0, shipping: 0, cod_advance_amount: 0, replacement_of: null,
};

describe('parcelFor', () => {
  it('uses the fixed box and 0.25 kg per unit with a 0.5 kg floor', () => {
    expect(parcelFor(1)).toEqual({ length: 30, breadth: 25, height: 5, weight: 0.5 });
    expect(parcelFor(3)).toEqual({ length: 30, breadth: 25, height: 5, weight: 0.75 });
  });
});

describe('splitName', () => {
  it('splits first and last', () => expect(splitName('Asha Rao Kumar')).toEqual({ first: 'Asha', last: 'Rao Kumar' }));
  it('single word keeps last empty', () => expect(splitName('Asha')).toEqual({ first: 'Asha', last: '' }));
});

describe('codCollectable', () => {
  it('is total minus the paid advance', () => expect(codCollectable({ total: 1000, cod_advance_amount: 200 })).toBe(800));
});

describe('buildForwardOrder', () => {
  it('prepaid order', () => {
    const p = buildForwardOrder(order, items, 'work');
    expect(p).toMatchObject({
      order_id: 'V26-ABC', order_date: '2026-09-28 09:30', pickup_location: 'work',
      billing_customer_name: 'Asha', billing_last_name: 'Rao Kumar', billing_address: '12 Beach Rd',
      billing_address_2: 'Flat 3', billing_city: 'Visakhapatnam', billing_pincode: '530017',
      billing_state: 'Andhra Pradesh', billing_country: 'India', billing_email: 'a@b.in',
      billing_phone: '9812345670', shipping_is_billing: true, payment_method: 'Prepaid', sub_total: 4997,
      length: 30, breadth: 25, height: 5, weight: 0.75,
    });
    expect(p.order_items).toEqual([
      { name: 'Linen Shirt (M · Sand)', sku: 'v1', units: 2, selling_price: 1999 },
      { name: 'Tote', sku: 'v2', units: 1, selling_price: 999 },
    ]);
  });
  it('COD collects only the balance', () => {
    const p = buildForwardOrder({ ...order, payment_method: 'COD', total: 1000, cod_advance_amount: 200 }, items, 'work');
    expect(p.payment_method).toBe('COD');
    expect(p.sub_total).toBe(800);
  });
  it('replacement ships prepaid at declared item value', () => {
    const p = buildForwardOrder({ ...order, total: 0, replacement_of: 'orig', order_number: 'V26-R1' }, items, 'work');
    expect(p.payment_method).toBe('Prepaid');
    expect(p.sub_total).toBe(4997);
  });
});

describe('buildReturnOrder', () => {
  it('picks up from the customer and delivers to the warehouse', () => {
    const wh = { name: 'Karthik', address: '2-6-155, MVP Main Rd', address_2: 'vault26', city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', pin_code: '530017', phone: '9390060185', email: 'w@v.in' };
    const p = buildReturnOrder(order, items, wh, new Date('2026-10-01T10:00:00Z'));
    expect(p).toMatchObject({
      order_id: 'V26-ABC-R', order_date: '2026-10-01 10:00',
      pickup_customer_name: 'Asha', pickup_last_name: 'Rao Kumar', pickup_address: '12 Beach Rd, Flat 3',
      pickup_pincode: '530017', pickup_phone: '9812345670',
      shipping_customer_name: 'Karthik', shipping_address: '2-6-155, MVP Main Rd, vault26', shipping_pincode: '530017',
      shipping_phone: '9390060185', payment_method: 'Prepaid', sub_total: 4997, weight: 0.75,
    });
  });
});

describe('mapShipmentEvent', () => {
  it('forward: pickup / transit / out for delivery → SHIPPED', () => {
    for (const s of ['PICKED UP', 'IN TRANSIT', 'OUT FOR DELIVERY', 'Shipped', 'REACHED AT DESTINATION HUB'])
      expect(mapShipmentEvent(s, false)).toEqual({ kind: 'shipped' });
  });
  it('forward: delivered', () => expect(mapShipmentEvent('DELIVERED', false)).toEqual({ kind: 'delivered' }));
  it('forward: RTO beats delivered wording', () => {
    expect(mapShipmentEvent('RTO INITIATED', false)).toEqual({ kind: 'rto' });
    expect(mapShipmentEvent('RTO DELIVERED', false)).toEqual({ kind: 'rto' });
  });
  it('return: transit then received', () => {
    expect(mapShipmentEvent('PICKED UP', true)).toEqual({ kind: 'return_in_transit' });
    expect(mapShipmentEvent('DELIVERED', true)).toEqual({ kind: 'return_received' });
  });
  it('unknown / pre-pickup statuses are only recorded', () => {
    expect(mapShipmentEvent('PICKUP SCHEDULED', false)).toEqual({ kind: 'none' });
    expect(mapShipmentEvent('', false)).toEqual({ kind: 'none' });
  });
});

describe('returnEligibility', () => {
  const now = new Date('2026-10-05T00:00:00Z');
  const delivered = { status: 'DELIVERED', delivered_at: '2026-09-30T00:00:00Z', return_status: 'NONE', return_awb: null as string | null, replacement_of: null };
  it('allows within the window', () => expect(returnEligibility(delivered, 7, now)).toEqual({ ok: true }));
  it('rejects outside the window', () => expect(returnEligibility({ ...delivered, delivered_at: '2026-09-20T00:00:00Z' }, 7, now)).toEqual({ ok: false, error: 'The 7-day return window has closed' }));
  it('rejects undelivered orders', () => expect(returnEligibility({ ...delivered, status: 'SHIPPED' }, 7, now)).toMatchObject({ ok: false }));
  it('rejects a second return once pickup is booked', () => expect(returnEligibility({ ...delivered, return_status: 'PICKUP_SCHEDULED', return_awb: 'R1' }, 7, now)).toMatchObject({ ok: false }));
  it('allows retrying a requested return whose pickup failed', () => expect(returnEligibility({ ...delivered, return_status: 'REQUESTED', return_awb: null }, 7, now)).toEqual({ ok: true }));
});
