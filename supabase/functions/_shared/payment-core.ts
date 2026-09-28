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

/**
 * Money was captured but confirm_order_payment refused it. The caller always refunds;
 * this says what to tell the customer and whether to record the refund on the order
 * (not when the order is already paid by a different payment — that row isn't ours to touch).
 */
export function confirmFailure(dbError: string): { status: number; error: string; recordOnOrder: boolean } {
  if (dbError.includes('OUT_OF_STOCK')) {
    return { status: 409, recordOnOrder: true, error: 'An item sold out while you were paying. Your payment has been refunded.' };
  }
  if (dbError.includes('NOT_PENDING')) {
    return { status: 409, recordOnOrder: true, error: 'This order was cancelled before your payment completed. Your payment has been refunded.' };
  }
  if (dbError.includes('ALREADY_CONFIRMED')) {
    return { status: 409, recordOnOrder: false, error: 'This order was already paid. Your duplicate payment has been refunded.' };
  }
  return { status: 500, recordOnOrder: true, error: "We couldn't confirm your order, so your payment has been refunded. Please try again." };
}

/** Maps a Razorpay refund status onto our columns. Failed refunds go back to REQUESTED so admin can retry. */
export function refundOutcome(rzpStatus: string, refundPaise: number, paymentPaise: number) {
  if (rzpStatus === 'processed') {
    return { refund_status: 'REFUNDED' as const, paymentRefunded: refundPaise >= paymentPaise, failed: false };
  }
  if (rzpStatus === 'failed') return { refund_status: 'REQUESTED' as const, paymentRefunded: false, failed: true };
  return { refund_status: 'PROCESSING' as const, paymentRefunded: false, failed: false };
}

/** Razorpay webhooks sign the raw request body with the webhook secret (X-Razorpay-Signature). */
export async function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  return timingSafeEqual(await hmacSha256Hex(secret, rawBody), signature);
}
