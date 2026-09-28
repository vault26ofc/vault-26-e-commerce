// Minimal Shiprocket API client. Credentials come from Edge Function secrets only.
import type { Warehouse } from './shipping-core.ts';

const BASE = 'https://apiv2.shiprocket.in/v1/external';

export class ShiprocketError extends Error {
  constructor(public status: number, message: string, public body?: unknown) { super(message); }
}

let cachedToken: { value: string; at: number } | null = null;

async function token(): Promise<string> {
  // Tokens last 10 days; reuse within a warm instance for an hour.
  if (cachedToken && Date.now() - cachedToken.at < 3_600_000) return cachedToken.value;
  const email = Deno.env.get('SHIPROCKET_EMAIL');
  const password = Deno.env.get('SHIPROCKET_PASSWORD');
  if (!email || !password) throw new Error('Shiprocket credentials are not configured');
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new ShiprocketError(res.status, `Shiprocket login failed: ${data.message ?? res.status}`);
  cachedToken = { value: data.token, at: Date.now() };
  return data.token;
}

/** Shiprocket reports some failures with HTTP 200 and a message; callers check the fields they need. */
async function sr<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.errors ? ` ${JSON.stringify(data.errors)}` : '';
    throw new ShiprocketError(res.status, `${data?.message ?? `Shiprocket error ${res.status}`}${detail}`, data);
  }
  return data as T;
}

export type SrCreated = { order_id: number; shipment_id: number; status?: string; message?: string };
export type SrAwb = { awb_assign_status: number; message?: string; response?: { data?: { awb_code?: string; courier_name?: string } } };
export type SrPickup = { pickup_status: number; message?: string; response?: { pickup_scheduled_date?: string } };

export const createAdhocOrder = (payload: unknown) => sr<SrCreated>('POST', '/orders/create/adhoc', payload);
export const createReturnOrder = (payload: unknown) => sr<SrCreated>('POST', '/orders/create/return', payload);
export const assignAwb = (shipmentId: string, isReturn = false) =>
  sr<SrAwb>('POST', '/courier/assign/awb', { shipment_id: shipmentId, ...(isReturn ? { is_return: 1 } : {}) });
export const generatePickup = (shipmentId: string) =>
  sr<SrPickup>('POST', '/courier/generate/pickup', { shipment_id: [shipmentId] });
export const cancelOrders = (srOrderIds: string[]) => sr<unknown>('POST', '/orders/cancel', { ids: srOrderIds.map(Number) });
export const cancelShipmentsByAwb = (awbs: string[]) => sr<unknown>('POST', '/orders/cancel/shipment/awbs', { awbs });

export const trackingUrl = (awb: string) => `https://shiprocket.co/tracking/${awb}`;

export async function pickupWarehouse(location: string): Promise<Warehouse & { pickup_location: string }> {
  const data = await sr<{ data: { shipping_address: (Warehouse & { pickup_location: string })[] } }>('GET', '/settings/company/pickup');
  const list = data.data.shipping_address ?? [];
  const found = list.find((a) => a.pickup_location === location);
  if (!found) {
    throw new Error(`Pickup location "${location}" not found in Shiprocket. Valid names: ${list.map((a) => a.pickup_location).join(', ')}`);
  }
  return found;
}
