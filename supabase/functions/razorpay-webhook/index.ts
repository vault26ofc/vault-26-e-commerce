// Razorpay → us, server to server. Confirms orders whose customer closed the tab before
// razorpay-verify-payment ran. Deployed with verify_jwt = false; authenticated by X-Razorpay-Signature.
import { confirmOrRefund } from '../_shared/confirm.ts';
import { json, serviceClient } from '../_shared/http.ts';
import { amountDuePaise, refundOutcome, verifyWebhookSignature } from '../_shared/payment-core.ts';
import { capturePayment } from '../_shared/razorpay.ts';

type PaymentEntity = { id: string; order_id: string | null; amount: number; status: string };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const raw = await req.text();
  const ok = await verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'), Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '');
  if (!ok) return json({ error: 'Invalid signature' }, 401);

  try {
    const event = JSON.parse(raw);
    let payment: PaymentEntity | undefined = event?.payload?.payment?.entity;

    // Refund finished or failed → update the order without anyone pressing "Refresh status".
    if (event?.event === 'refund.processed' || event?.event === 'refund.failed') {
      const refund: { id: string; amount: number; status: string } | undefined = event?.payload?.refund?.entity;
      if (!refund) return json({ ignored: 'no refund entity' });
      const db = serviceClient();
      const { data: order } = await db.from('orders')
        .select('id, refund_status, refund_notes').eq('razorpay_refund_id', refund.id).maybeSingle();
      if (!order) return json({ ignored: 'no matching order' }); // e.g. refunds made in the dashboard
      const o = refundOutcome(refund.status, refund.amount, payment?.amount ?? refund.amount);
      const patch = o.failed
        ? { razorpay_refund_id: null, refund_status: o.refund_status,
            refund_notes: [order.refund_notes, `Razorpay refund ${refund.id} failed — retry the refund.`].filter(Boolean).join('\n') }
        : { refund_status: o.refund_status, refunded_at: new Date().toISOString(), ...(o.paymentRefunded ? { payment_status: 'REFUNDED' } : {}) };
      const { error } = await db.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;
      return json({ refund: o.failed ? 'FAILED' : o.refund_status });
    }
    // Only payments that can move money matter; everything else is acknowledged.
    if (!['payment.authorized', 'payment.captured', 'order.paid'].includes(event?.event) || !payment?.order_id
      || !['authorized', 'captured'].includes(payment.status)) {
      return json({ ignored: event?.event ?? 'unknown' });
    }

    const db = serviceClient();
    const { data: order } = await db.from('orders')
      .select('id, payment_method, total, cod_advance_amount, razorpay_payment_id')
      .eq('razorpay_order_id', payment.order_id).maybeSingle();
    if (!order) return json({ ignored: 'no matching order' }); // not one of ours (e.g. payment links)
    if (order.razorpay_payment_id === payment.id) return json({ already: true });

    const expected = amountDuePaise(order);
    if (payment.amount !== expected) {
      console.error('webhook amount mismatch', order.id, payment.id, payment.amount, expected);
      return json({ ignored: 'amount mismatch' });
    }

    if (payment.status === 'authorized') payment = await capturePayment(payment.id, expected);
    if (payment.status !== 'captured') return json({ ignored: `payment ${payment.status}` });

    const result = await confirmOrRefund(db, order.id, payment.id, expected);
    // Always 200 once handled, or Razorpay keeps retrying a decision we already made.
    return json(result.ok ? { confirmed: true } : { refunded: true, reason: result.error });
  } catch (e) {
    console.error('razorpay-webhook error', e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500); // 5xx → Razorpay retries
  }
});
