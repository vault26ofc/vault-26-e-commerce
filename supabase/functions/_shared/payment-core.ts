// Pure payment helpers — no imports, so they run in Deno (edge functions) and Node (vitest).

export type PayableOrder = {
  payment_method: string;
  total: number | string;
  cod_advance_amount: number | string | null;
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  return timingSafeEqual(await hmacSha256Hex(secret, `${orderId}|${paymentId}`), signature);
}

/** What Razorpay should charge for this order: full total, or the COD advance. */
export function amountDuePaise(o: PayableOrder): number {
  const rupees = o.payment_method === 'COD' ? Number(o.cod_advance_amount) : Number(o.total);
  return Math.round(rupees * 100);
}

export function validateRefund(requestedRupees: number, refundablePaise: number): { paise: number } | { error: string } {
  const paise = Math.round(Number(requestedRupees) * 100);
  if (!(paise >= 100)) return { error: 'Refund must be at least ₹1' };
  if (paise > refundablePaise) return { error: `Maximum refundable is ₹${(refundablePaise / 100).toFixed(2)}` };
  return { paise };
}
