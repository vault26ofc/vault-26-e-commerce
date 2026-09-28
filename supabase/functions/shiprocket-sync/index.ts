// PACKED → Shiprocket order → courier/AWB → pickup booked. Called by the orders_shipping_hooks
// trigger (x-internal-secret) or by an admin's "Retry shipment". Each step is saved as it succeeds,
// so a retry resumes where the last attempt stopped and never creates a second shipment.
import { corsHeaders } from '../_shared/cors.ts';
import { isInternalOrAdmin, json, serviceClient } from '../_shared/http.ts';
import { buildForwardOrder } from '../_shared/shipping-core.ts';
import { assignAwb, createAdhocOrder, generatePickup, trackingUrl } from '../_shared/shiprocket.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const db = serviceClient();
  if (!(await isInternalOrAdmin(req, db))) return json({ error: 'Unauthorized' }, 401);

  const { order_id } = await req.json().catch(() => ({}));
  if (!order_id) return json({ error: 'order_id is required' }, 400);

  const save = (patch: Record<string, unknown>) => db.from('orders').update(patch).eq('id', order_id);

  try {
    const { data: order } = await db.from('orders').select('*, order_items(*)').eq('id', order_id).maybeSingle();
    if (!order) return json({ error: 'Order not found' }, 404);
    if (order.awb_number) return json({ awb: order.awb_number, courier: order.courier_name, already: true });
    if (order.status !== 'PACKED') return json({ error: `Order must be PACKED to ship (is ${order.status})` }, 400);
    const paid = order.payment_status === 'PAID' || order.cod_advance_paid || order.replacement_of;
    if (!paid) {
      await save({ shipping_error: 'Not shipped: payment has not been received for this order.' });
      return json({ error: 'Order is not paid' }, 400);
    }

    // 1. Shiprocket order (skipped when a previous attempt already created it)
    let shipmentId: string | null = order.shipment_id;
    if (!order.shiprocket_order_id || !shipmentId) {
      const payload = buildForwardOrder(order, order.order_items, Deno.env.get('SHIPROCKET_PICKUP_LOCATION') ?? 'work');
      const created = await createAdhocOrder(payload);
      if (!created.shipment_id) throw new Error(`Shiprocket did not create the order: ${created.message ?? JSON.stringify(created)}`);
      shipmentId = String(created.shipment_id);
      await save({ shiprocket_order_id: String(created.order_id), shipment_id: shipmentId });
    }

    // 2. Courier + AWB
    const awb = await assignAwb(shipmentId!);
    const awbCode = awb.response?.data?.awb_code;
    if (awb.awb_assign_status !== 1 || !awbCode) {
      throw new Error(`Courier assignment failed: ${awb.message ?? JSON.stringify(awb)}`);
    }
    const courier = awb.response?.data?.courier_name ?? null;
    await save({ awb_number: awbCode, courier_name: courier, tracking_url: trackingUrl(awbCode), shipping_error: null });

    // 3. Pickup — best effort: the shipment exists either way.
    try {
      const pickup = await generatePickup(shipmentId!);
      if (pickup.pickup_status === 1) {
        await save({ pickup_scheduled_at: pickup.response?.pickup_scheduled_date ?? new Date().toISOString() });
      } else {
        await save({ shipping_error: `Shipment created (AWB ${awbCode}) but pickup was not booked: ${pickup.message ?? 'unknown'}. Schedule it in Shiprocket.` });
      }
    } catch (e) {
      await save({ shipping_error: `Shipment created (AWB ${awbCode}) but pickup was not booked: ${(e as Error).message}. Schedule it in Shiprocket.` });
    }

    return json({ awb: awbCode, courier });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('shiprocket-sync failed', order_id, message);
    await save({ shipping_error: message });
    return json({ error: message }, 502);
  }
});
