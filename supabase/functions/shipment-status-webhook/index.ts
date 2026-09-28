// Shiprocket → us on every tracking update. Name must not contain "shiprocket" (Shiprocket rejects
// such URLs). Deployed with verify_jwt = false; authenticated by the x-api-key header.
import { json, serviceClient } from '../_shared/http.ts';
import { mapShipmentEvent } from '../_shared/shipping-core.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: true }); // Shiprocket probes the URL when saving
  const expected = Deno.env.get('SHIPROCKET_WEBHOOK_SECRET');
  if (!expected || req.headers.get('x-api-key') !== expected) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => null);
  const awb = body?.awb ? String(body.awb) : '';
  const status = String(body?.current_status ?? body?.shipment_status ?? '');
  if (!awb) return json({ ok: true, ignored: 'no awb' }); // test pings

  try {
    const db = serviceClient();
    const { data: forward } = await db.from('orders').select('id, status').eq('awb_number', awb).maybeSingle();
    const { data: ret } = forward ? { data: null } : await db.from('orders').select('id, return_status').eq('return_awb', awb).maybeSingle();
    const order = forward ?? ret;
    if (!order) return json({ ok: true, ignored: 'unknown awb' });

    const event = mapShipmentEvent(status, !forward);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { shipping_status: status };

    if (forward) {
      const s = forward.status;
      if (event.kind === 'shipped' && (s === 'PENDING' || s === 'PACKED')) Object.assign(patch, { status: 'SHIPPED', shipped_at: now });
      if (event.kind === 'delivered' && s !== 'DELIVERED' && s !== 'CANCELLED') Object.assign(patch, { status: 'DELIVERED', delivered_at: now });
      if (event.kind === 'rto') Object.assign(patch, { rto_initiated_at: now });
    } else {
      const r = ret!.return_status;
      if (event.kind === 'return_in_transit' && (r === 'REQUESTED' || r === 'PICKUP_SCHEDULED')) patch.return_status = 'IN_TRANSIT';
      if (event.kind === 'return_received' && ['REQUESTED', 'PICKUP_SCHEDULED', 'IN_TRANSIT'].includes(r)) {
        Object.assign(patch, { return_status: 'RECEIVED', return_received_at: now });
      }
    }

    const { error } = await db.from('orders').update(patch).eq('id', order.id);
    if (error) throw error;
    return json({ ok: true, event: event.kind });
  } catch (e) {
    console.error('shipment-status-webhook error', awb, e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
