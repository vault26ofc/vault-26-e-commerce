import { corsHeaders } from '../_shared/cors.ts';
import { getUser, json, serviceClient } from '../_shared/http.ts';
import { amountDuePaise, verifyRazorpaySignature } from '../_shared/payment-core.ts';
import { capturePayment, createRefund, getPayment, RazorpayError } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json().catch(() => ({}));
    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing fields' }, 400);
    }

    const db = serviceClient();
    const { data: order } = await db.from('orders')
      .select('id, user_id, order_number, payment_method, total, cod_advance_amount, razorpay_order_id, razorpay_payment_id')
      .eq('id', order_id).maybeSingle();
    if (!order || order.user_id !== user.id) return json({ error: 'Order not found' }, 403);

    if (order.razorpay_payment_id) {
      return order.razorpay_payment_id === razorpay_payment_id
        ? json({ success: true })
        : json({ error: 'Order is already paid with a different payment' }, 409);
    }
    if (order.razorpay_order_id !== razorpay_order_id) return json({ error: 'Payment does not belong to this order' }, 400);

    const valid = await verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, Deno.env.get('RAZORPAY_KEY_SECRET') ?? '');
    if (!valid) return json({ error: 'Invalid payment signature' }, 400);

    const expected = amountDuePaise(order);
    let payment = await getPayment(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id || payment.amount !== expected) {
      return json({ error: 'Payment amount or order mismatch' }, 400);
    }
    if (payment.status === 'authorized') payment = await capturePayment(razorpay_payment_id, expected);
    if (payment.status !== 'captured') return json({ error: `Payment not captured (status: ${payment.status})` }, 400);

    const { error } = await db.rpc('confirm_order_payment', {
      p_order_id: order.id, p_payment_id: razorpay_payment_id, p_amount_paise: expected,
    });
    if (!error) return json({ success: true });

    if (error.message.includes('OUT_OF_STOCK')) {
      const refund = await createRefund(razorpay_payment_id, expected, { order_id: order.id, reason: 'out_of_stock' });
      await db.from('orders').update({
        status: 'CANCELLED',
        payment_status: 'REFUNDED',
        razorpay_payment_id,
        payment_amount_paise: expected,
        razorpay_refund_id: refund.id,
        refund_amount: expected / 100,
        refund_status: refund.status === 'processed' ? 'REFUNDED' : 'PROCESSING',
        refunded_at: refund.status === 'processed' ? new Date().toISOString() : null,
        refund_notes: 'An item sold out before your payment completed. Your payment has been refunded automatically.',
      }).eq('id', order.id);
      return json({ error: 'An item sold out while you were paying. Your payment has been refunded.' }, 409);
    }
    if (error.message.includes('ALREADY_CONFIRMED')) return json({ error: 'Order is already paid with a different payment' }, 409);
    if (error.message.includes('NOT_PENDING')) return json({ error: 'This order is not awaiting payment' }, 409);
    throw error;
  } catch (e) {
    if (e instanceof RazorpayError) return json({ error: e.message }, 502);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
