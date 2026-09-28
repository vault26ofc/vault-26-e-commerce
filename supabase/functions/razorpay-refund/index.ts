import { corsHeaders } from '../_shared/cors.ts';
import { getUser, isAdmin, json, serviceClient } from '../_shared/http.ts';
import { refundOutcome, validateRefund } from '../_shared/payment-core.ts';
import { createRefund, getPayment, getRefund, RazorpayError } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const db = serviceClient();
    if (!(await isAdmin(db, user.id))) return json({ error: 'Admins only' }, 403);

    const { action, order_id, amount } = await req.json().catch(() => ({}));
    if (!order_id || (action !== 'refund' && action !== 'sync')) return json({ error: 'action and order_id are required' }, 400);

    const { data: order } = await db.from('orders')
      .select('id, order_number, razorpay_payment_id, razorpay_refund_id, refund_status, refund_notes')
      .eq('id', order_id).maybeSingle();
    if (!order) return json({ error: 'Order not found' }, 404);
    if (!order.razorpay_payment_id) return json({ error: 'Nothing was charged online for this order' }, 400);

    // Writes a Razorpay refund's state onto the order. A failed refund is cleared so admin can retry.
    const record = async (refundId: string, rzpStatus: string, refundPaise: number, paymentPaise: number) => {
      const o = refundOutcome(rzpStatus, refundPaise, paymentPaise);
      const patch: Record<string, unknown> = o.failed
        ? {
          razorpay_refund_id: null,
          refund_status: o.refund_status,
          refund_notes: [order.refund_notes, `Razorpay refund ${refundId} failed — retry the refund.`].filter(Boolean).join('\n'),
        }
        : {
          razorpay_refund_id: refundId,
          refund_amount: refundPaise / 100,
          refund_status: o.refund_status,
          ...(o.refund_status === 'REFUNDED' ? { refunded_at: new Date().toISOString() } : {}),
          ...(o.paymentRefunded ? { payment_status: 'REFUNDED' } : {}),
        };
      const { error } = await db.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;
      return o.failed ? 'FAILED' : o.refund_status;
    };

    // Read the paid amount from Razorpay itself — also covers orders placed before payment_amount_paise existed.
    const payment = await getPayment(order.razorpay_payment_id);

    if (action === 'sync') {
      if (!order.razorpay_refund_id) return json({ error: 'No Razorpay refund on this order' }, 400);
      const r = await getRefund(order.razorpay_refund_id);
      return json({ refund_status: await record(r.id, r.status, r.amount, payment.amount) });
    }

    if (order.razorpay_refund_id) return json({ error: 'This order already has a Razorpay refund' }, 409);
    const check = validateRefund(Number(amount), payment.amount - (payment.amount_refunded ?? 0));
    if ('error' in check) return json({ error: check.error }, 400);

    const refund = await createRefund(order.razorpay_payment_id, check.paise, { order_id: order.id, order_number: order.order_number });
    return json({ refund_status: await record(refund.id, refund.status, check.paise, payment.amount), refund_id: refund.id });
  } catch (e) {
    if (e instanceof RazorpayError) return json({ error: e.message }, 502);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
