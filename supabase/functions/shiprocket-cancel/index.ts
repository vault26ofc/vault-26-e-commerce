// Order CANCELLED → cancel it on Shiprocket. Before pickup the order is simply cancelled; once the
// courier has it, Shiprocket needs the AWB cancelled instead, which starts return-to-origin (RTO).
import { corsHeaders } from '../_shared/cors.ts';
import { isInternalOrAdmin, json, serviceClient } from '../_shared/http.ts';
import { cancelOrders, cancelShipmentsByAwb } from '../_shared/shiprocket.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = serviceClient();
  if (!(await isInternalOrAdmin(req, db))) return json({ error: 'Unauthorized' }, 401);

  const { order_id } = await req.json().catch(() => ({}));
  if (!order_id) return json({ error: 'order_id is required' }, 400);

  const { data: order } = await db.from('orders')
    .select('id, status, shiprocket_order_id, awb_number, shiprocket_cancelled_at').eq('id', order_id).maybeSingle();
  if (!order) return json({ error: 'Order not found' }, 404);
  if (!order.shiprocket_order_id) return json({ skipped: 'no Shiprocket order' });
  if (order.shiprocket_cancelled_at) return json({ already: true });

  let method = 'order';
  try {
    await cancelOrders([order.shiprocket_order_id]);
  } catch (first) {
    if (!order.awb_number) {
      const message = `Shiprocket cancel failed: ${(first as Error).message}`;
      await db.from('orders').update({ shipping_error: message }).eq('id', order.id);
      return json({ error: message }, 502);
    }
    try {
      await cancelShipmentsByAwb([order.awb_number]);
      method = 'awb';
    } catch (second) {
      const message = `Shiprocket cancel failed: ${(first as Error).message}; by AWB: ${(second as Error).message}. Cancel it in Shiprocket.`;
      await db.from('orders').update({ shipping_error: message }).eq('id', order.id);
      return json({ error: message }, 502);
    }
  }

  await db.from('orders').update({
    shiprocket_cancelled_at: new Date().toISOString(),
    shipping_error: null,
    ...(method === 'awb' ? { rto_initiated_at: new Date().toISOString() } : {}),
  }).eq('id', order.id);
  return json({ cancelled: true, method });
});
