import { corsHeaders } from '../_shared/cors.ts';
import { getUser, json, serviceClient } from '../_shared/http.ts';
import { amountDuePaise } from '../_shared/payment-core.ts';
import { createOrder, getOrder, keyId, RazorpayError } from '../_shared/razorpay.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return json({ error: 'order_id is required' }, 400);

    const db = serviceClient();
    const { data: order } = await db.from('orders')
      .select('id, user_id, order_number, status, payment_method, payment_status, total, cod_advance_amount, cod_advance_paid, razorpay_order_id')
      .eq('id', order_id).maybeSingle();
    if (!order || order.user_id !== user.id) return json({ error: 'Order not found' }, 403);
    if (order.status === 'CANCELLED' || order.payment_status !== 'PENDING' || order.cod_advance_paid) {
      return json({ error: 'This order is not awaiting payment' }, 400);
    }

    const amount = amountDuePaise(order);
    if (amount < 100) return json({ error: 'Amount must be at least ₹1' }, 400);

    // Reuse the Razorpay order on retry / double-click
    if (order.razorpay_order_id) {
      try {
        const existing = await getOrder(order.razorpay_order_id);
        if (existing.amount === amount && existing.status !== 'paid') {
          return json({ order: { id: existing.id, amount: existing.amount, currency: existing.currency }, key_id: keyId() });
        }
      } catch { /* fall through and create a fresh one */ }
    }

    const rz = await createOrder(amount, order.order_number, { order_id: order.id });
    const { error } = await db.from('orders').update({ razorpay_order_id: rz.id }).eq('id', order.id);
    if (error) throw error;
    return json({ order: { id: rz.id, amount: rz.amount, currency: rz.currency }, key_id: keyId() });
  } catch (e) {
    if (e instanceof RazorpayError) return json({ error: e.message }, 502);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
