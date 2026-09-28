// Customer (or admin) requests a return on a delivered order: book a reverse pickup from the
// customer's address to our pickup warehouse.
import { corsHeaders } from '../_shared/cors.ts';
import { getUser, isAdmin, json, serviceClient } from '../_shared/http.ts';
import { buildReturnOrder, returnEligibility } from '../_shared/shipping-core.ts';
import { assignAwb, createReturnOrder, generatePickup, pickupWarehouse, trackingUrl } from '../_shared/shiprocket.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { order_id, reason } = await req.json().catch(() => ({}));
    let why = String(reason ?? '').trim();
    if (!order_id) return json({ error: 'order_id is required' }, 400);

    const db = serviceClient();
    const { data: order } = await db.from('orders').select('*, order_items(*)').eq('id', order_id).maybeSingle();
    if (!order || (order.user_id !== user.id && !(await isAdmin(db, user.id)))) return json({ error: 'Order not found' }, 403);

    const { data: setting } = await db.from('settings').select('value').eq('key', 'return_window_days').maybeSingle();
    const windowDays = Number(setting?.value ?? 7) || 7;
    const eligible = returnEligibility(order, windowDays, new Date());
    if (!eligible.ok) return json({ error: eligible.error }, 400);
    if (why.length < 3) why = order.return_reason ?? ''; // admin retry keeps the customer's reason
    if (why.length < 3) return json({ error: 'Please tell us why you are returning this order' }, 400);

    // Record the request first, so it is never lost even if Shiprocket fails below.
    await db.from('orders').update({
      return_status: 'REQUESTED', return_reason: why.slice(0, 500), return_requested_at: new Date().toISOString(),
    }).eq('id', order.id);

    try {
      const wh = await pickupWarehouse(Deno.env.get('SHIPROCKET_PICKUP_LOCATION') ?? 'work');
      // Resume: reuse the return shipment if a previous attempt created it.
      let shipmentId: string | null = order.return_shipment_id;
      if (!shipmentId) {
        const created = await createReturnOrder(buildReturnOrder(order, order.order_items, wh, new Date()));
        if (!created.shipment_id) throw new Error(`Shiprocket did not create the return: ${created.message ?? JSON.stringify(created)}`);
        shipmentId = String(created.shipment_id);
        await db.from('orders').update({ return_shiprocket_order_id: String(created.order_id), return_shipment_id: shipmentId }).eq('id', order.id);
      }

      const awb = await assignAwb(shipmentId, true);
      const awbCode = awb.response?.data?.awb_code;
      if (awb.awb_assign_status !== 1 || !awbCode) throw new Error(`Return courier assignment failed: ${awb.message ?? JSON.stringify(awb)}`);
      await db.from('orders').update({ return_awb: awbCode, return_tracking_url: trackingUrl(awbCode) }).eq('id', order.id);

      const pickup = await generatePickup(shipmentId).catch((e) => ({ pickup_status: 0, message: (e as Error).message }));
      await db.from('orders').update({
        return_status: 'PICKUP_SCHEDULED',
        shipping_error: pickup.pickup_status === 1 ? null : `Return AWB ${awbCode} created but pickup not booked: ${pickup.message ?? 'unknown'}`,
      }).eq('id', order.id);
      return json({ return_status: 'PICKUP_SCHEDULED', awb: awbCode });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('shiprocket-return failed', order.id, message);
      await db.from('orders').update({ shipping_error: `Return pickup not booked: ${message}` }).eq('id', order.id);
      // The customer's request is saved; admin sees the error and books it from Shiprocket.
      return json({ return_status: 'REQUESTED', warning: 'Return requested. We will schedule the pickup shortly.' });
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
