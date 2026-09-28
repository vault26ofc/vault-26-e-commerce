import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { confirmFailure, refundOutcome } from './payment-core.ts';
import { createRefund } from './razorpay.ts';

export type ConfirmResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Marks an order paid for a captured Razorpay payment (stock, coupon, status — atomically in SQL).
 * Shared by razorpay-verify-payment (browser) and razorpay-webhook (server-to-server), so whichever
 * arrives first confirms and the other is a no-op. If the order cannot be confirmed, the captured
 * money is refunded straight away — a customer is never charged without an order.
 */
export async function confirmOrRefund(db: SupabaseClient, orderId: string, paymentId: string, amountPaise: number): Promise<ConfirmResult> {
  const { error } = await db.rpc('confirm_order_payment', {
    p_order_id: orderId, p_payment_id: paymentId, p_amount_paise: amountPaise,
  });
  if (!error) return { ok: true };

  const failure = confirmFailure(error.message);
  console.error('confirm_order_payment failed; refunding', orderId, paymentId, error.message);
  const refund = await createRefund(paymentId, amountPaise, { order_id: orderId, reason: 'order_not_confirmed' });
  if (failure.recordOnOrder) {
    const outcome = refundOutcome(refund.status, amountPaise, amountPaise);
    await db.from('orders').update({
      status: 'CANCELLED',
      razorpay_payment_id: paymentId,
      payment_amount_paise: amountPaise,
      razorpay_refund_id: refund.id,
      refund_amount: amountPaise / 100,
      refund_status: outcome.refund_status,
      ...(outcome.paymentRefunded ? { payment_status: 'REFUNDED', refunded_at: new Date().toISOString() } : {}),
      refund_notes: failure.error,
    }).eq('id', orderId);
  }
  return { ok: false, status: failure.status, error: failure.error };
}
