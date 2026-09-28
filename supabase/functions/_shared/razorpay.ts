// Minimal Razorpay REST client. Keys come from Edge Function secrets only.
const BASE = 'https://api.razorpay.com/v1';

export class RazorpayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type RzpOrder = { id: string; amount: number; currency: string; status: string };
export type RzpPayment = { id: string; order_id: string; amount: number; amount_refunded: number; status: string };
export type RzpRefund = { id: string; amount: number; status: 'pending' | 'processed' | 'failed' };

export const keyId = () => Deno.env.get('RAZORPAY_KEY_ID') ?? '';

async function rzp<T>(method: string, path: string, body?: unknown): Promise<T> {
  const id = Deno.env.get('RAZORPAY_KEY_ID');
  const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!id || !secret) throw new Error('Razorpay keys are not configured');
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new RazorpayError(res.status, data?.error?.description || `Razorpay error ${res.status}`);
  return data as T;
}

export const createOrder = (amount: number, receipt: string, notes: Record<string, string>) =>
  rzp<RzpOrder>('POST', '/orders', { amount, currency: 'INR', receipt, notes });
export const getOrder = (id: string) => rzp<RzpOrder>('GET', `/orders/${id}`);
export const getPayment = (id: string) => rzp<RzpPayment>('GET', `/payments/${id}`);
export const capturePayment = (id: string, amount: number) =>
  rzp<RzpPayment>('POST', `/payments/${id}/capture`, { amount, currency: 'INR' });
export const createRefund = (paymentId: string, amount: number, notes: Record<string, string>) =>
  rzp<RzpRefund>('POST', `/payments/${paymentId}/refund`, { amount, notes });
export const getRefund = (id: string) => rzp<RzpRefund>('GET', `/refunds/${id}`);
