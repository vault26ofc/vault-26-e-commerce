import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { readFunctionError } from '@/lib/payment';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// Generated DB types predate the return columns; query orders untyped here.
const db = supabase as any;

const IN_PROGRESS = ['REQUESTED', 'PICKUP_SCHEDULED', 'IN_TRANSIT'];
const DONE = ['REFUNDED', 'REPLACED', 'REJECTED'];

/** What was paid online and can go back through Razorpay; COD cash has to be returned by hand. */
function refundBreakdown(o: any) {
  const online = o.payment_amount_paise ? o.payment_amount_paise / 100 : 0;
  const cash = o.payment_method === 'COD' ? Math.max(0, Number(o.total) - online) : 0;
  return { online, cash };
}

export default function AdminReturns() {
  const [orders, setOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    db.from('orders').select('*, order_items(product_name, variant_label, quantity)')
      .neq('return_status', 'NONE')
      .order('return_requested_at', { ascending: false })
      .then(({ data }: { data: any[] | null }) => setOrders(data || []));

  useEffect(() => {
    load();
    const channel = supabase.channel('admin-returns')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const run = async (id: string, fn: () => Promise<string | void>) => {
    setBusy(id);
    try { const msg = await fn(); if (msg) toast.success(msg); } catch (e: any) { toast.error(e.message || 'Something went wrong'); }
    setBusy(null);
    load();
  };

  const retryPickup = (o: any) => run(o.id, async () => {
    const { data, error } = await supabase.functions.invoke('shiprocket-return', { body: { order_id: o.id } });
    if (error) throw new Error(await readFunctionError(error));
    return data.return_status === 'PICKUP_SCHEDULED' ? `Return pickup booked · AWB ${data.awb}` : data.warning;
  });

  const refund = (o: any) => run(o.id, async () => {
    const { online, cash } = refundBreakdown(o);
    if (online > 0 && !o.razorpay_refund_id) {
      if (!confirm(`Refund ${inr(online)} to the customer through Razorpay?${cash ? `\n\nThe ${inr(cash)} paid in cash on delivery must be returned by hand (UPI/bank).` : ''}`)) return;
      const { error } = await supabase.functions.invoke('razorpay-refund', { body: { action: 'refund', order_id: o.id, amount: online } });
      if (error) throw new Error(await readFunctionError(error));
    } else if (!confirm(`Mark this return as refunded?${cash ? ` Make sure the ${inr(cash)} cash was returned to the customer.` : ''}`)) return;
    const { error } = await db.from('orders').update({ return_status: 'REFUNDED' }).eq('id', o.id);
    if (error) throw error;
    return 'Return refunded';
  });

  const replace = (o: any) => run(o.id, async () => {
    if (!confirm('Create a free replacement with the same items? It will be packed and booked for pickup automatically.')) return;
    const { error } = await db.rpc('create_replacement_order', { p_order_id: o.id });
    if (error) throw error;
    return 'Replacement created — booking pickup';
  });

  const reject = (o: any) => run(o.id, async () => {
    const note = prompt('Reason for rejecting (shown to the customer):');
    if (note === null) return;
    const { error } = await db.from('orders').update({
      return_status: 'REJECTED',
      refund_notes: [o.refund_notes, `Return rejected: ${note}`].filter(Boolean).join('\n'),
    }).eq('id', o.id);
    if (error) throw error;
    return 'Return rejected';
  });

  const section = (title: string, list: any[], empty: string) => (
    <section className="mb-10">
      <h2 className="font-display text-xl mb-3">{title}</h2>
      {list.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-border p-4">{empty}</div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {list.map((o) => {
            const { online, cash } = refundBreakdown(o);
            return (
              <div key={o.id} className="p-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="text-sm space-y-1">
                  <div className="font-medium">
                    <Link to={`/invoice/${o.id}`} target="_blank" className="underline">{o.order_number}</Link> · {o.email} · {inr(Number(o.total))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(o.order_items || []).map((i: any) => `${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ''} × ${i.quantity}`).join(', ')}
                  </div>
                  <div className="text-xs"><span className="uppercase tracking-widest">{o.return_status}</span>{o.return_requested_at && ` · requested ${new Date(o.return_requested_at).toLocaleDateString()}`}</div>
                  {o.return_reason && <div className="text-xs">Reason: {o.return_reason}</div>}
                  {o.return_awb && <a href={o.return_tracking_url} target="_blank" rel="noreferrer" className="text-xs underline">Return AWB {o.return_awb}</a>}
                  {o.return_status === 'RECEIVED' && (
                    <div className="text-xs text-muted-foreground">
                      Refundable online: {inr(online)}{cash > 0 && ` · cash collected on delivery: ${inr(cash)} (refund by hand)`}
                    </div>
                  )}
                  {o.replacement_order_id && <div className="text-xs">Replacement order created</div>}
                  {o.shipping_error && IN_PROGRESS.includes(o.return_status) && <div className="text-xs text-destructive">{o.shipping_error}</div>}
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  {o.return_status === 'REQUESTED' && !o.return_awb && (
                    <Button size="sm" variant="outline" disabled={busy === o.id} onClick={() => retryPickup(o)}>Book pickup</Button>
                  )}
                  {o.return_status === 'RECEIVED' && (
                    <>
                      <Button size="sm" disabled={busy === o.id} onClick={() => refund(o)}>Refund</Button>
                      <Button size="sm" variant="outline" disabled={busy === o.id} onClick={() => replace(o)}>Replace</Button>
                    </>
                  )}
                  {(IN_PROGRESS.includes(o.return_status) || o.return_status === 'RECEIVED') && (
                    <Button size="sm" variant="ghost" disabled={busy === o.id} onClick={() => reject(o)}>Reject</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl">Returns</h1>
        <p className="text-sm text-muted-foreground mt-1">Reverse pickups update automatically from Shiprocket. Refund or replace once a return reaches the warehouse.</p>
      </div>
      {section('Ready to refund or replace', orders.filter((o) => o.return_status === 'RECEIVED'), 'Nothing has arrived back at the warehouse.')}
      {section('In progress', orders.filter((o) => IN_PROGRESS.includes(o.return_status)), 'No returns on the way.')}
      {section('Closed', orders.filter((o) => DONE.includes(o.return_status)), 'No closed returns yet.')}
    </div>
  );
}
