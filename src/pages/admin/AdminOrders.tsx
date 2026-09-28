import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { paymentLabel, readFunctionError } from '@/lib/payment';
import { toast } from 'sonner';
import { downloadCsv } from '@/lib/exportCsv';
import { Download } from 'lucide-react';

const STATUSES = ['PENDING','PACKED','SHIPPED','DELIVERED','CANCELLED'] as const;

function ShippingCell({ o, onRetry, retrying }: { o: any; onRetry: () => void; retrying: boolean }) {
  if (o.awb_number) {
    return (
      <div className="text-xs space-y-0.5">
        <a href={o.tracking_url} target="_blank" rel="noreferrer" className="underline">AWB {o.awb_number}</a>
        <div className="text-muted-foreground">{o.courier_name}{o.shipping_status ? ` · ${o.shipping_status}` : ''}</div>
        {o.rto_initiated_at && <div className="text-destructive">Returning to origin</div>}
        {o.shipping_error && <div className="text-destructive max-w-[220px]">{o.shipping_error}</div>}
      </div>
    );
  }
  if (o.status === 'PACKED') {
    return (
      <div className="text-xs space-y-1 max-w-[220px]">
        {o.shipping_error
          ? <div className="text-destructive">{o.shipping_error}</div>
          : <div className="text-muted-foreground">No shipment yet</div>}
        {/* Also covers orders packed before automation existed, or while the hook was still running. */}
        <button onClick={onRetry} disabled={retrying} className="border border-border px-2 py-1 uppercase tracking-widest hover:bg-secondary disabled:opacity-50">
          {retrying ? 'Booking…' : o.shipping_error ? 'Retry shipment' : 'Book shipment'}
        </button>
      </div>
    );
  }
  if (o.status === 'PENDING') return <span className="text-xs text-muted-foreground">Set PACKED to book pickup</span>;
  return <span className="text-xs text-muted-foreground">—</span>;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [retrying, setRetrying] = useState<string | null>(null);
  const load = () => supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => setOrders(data || []));

  useEffect(() => {
    load();
    // Shiprocket webhook and shipment booking update orders server-side; reflect them live.
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        setOrders((prev) => {
          if (payload.eventType === 'INSERT') return [payload.new, ...prev];
          if (payload.eventType === 'DELETE') return prev.filter((o) => o.id !== payload.old.id);
          return prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o));
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const update = async (o: any, status: string) => {
    if (!STATUSES.includes(status as any)) return toast.error('Invalid status');
    if (status === 'PACKED' && o.payment_status !== 'PAID' && !o.cod_advance_paid && !o.replacement_of) {
      if (!confirm('This order has not been paid. Shipping will be refused until payment arrives. Mark PACKED anyway?')) return;
    }
    if (status === 'CANCELLED' && o.awb_number && !confirm('This order has a shipment. Cancelling will cancel it on Shiprocket (return-to-origin if already picked up). Continue?')) return;
    const { error } = await supabase.from('orders').update({ status: status as typeof STATUSES[number] }).eq('id', o.id);
    if (error) return toast.error(error.message);
    toast.success(status === 'PACKED' ? 'Packed — booking Shiprocket pickup' : 'Status updated');
    load();
  };

  const retry = async (o: any) => {
    setRetrying(o.id);
    const { data, error } = await supabase.functions.invoke('shiprocket-sync', { body: { order_id: o.id } });
    setRetrying(null);
    if (error) return toast.error(await readFunctionError(error));
    toast.success(`Shipment booked · AWB ${data.awb}`);
    load();
  };

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);

  const exportRows = () => {
    if (!filtered.length) return toast.error('Nothing to export');
    downloadCsv(`orders-${new Date().toISOString().slice(0,10)}.csv`,
      filtered.map((o) => ({ order_number: o.order_number, email: o.email, status: o.status, payment_method: o.payment_method, payment_status: o.payment_status, subtotal: o.subtotal, shipping: o.shipping, total: o.total, awb: o.awb_number, courier: o.courier_name, created_at: o.created_at })));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl md:text-3xl">Orders</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportRows} className="border border-border px-3 py-2 text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-secondary"><Download className="h-3.5 w-3.5" /> CSV</button>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-border bg-transparent px-3 py-2 text-sm">
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>{['Order','Email','Total','Payment','Status','Shipping','Date','Invoice'].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border align-top">
                <td className="p-3">
                  {o.order_number}
                  {o.replacement_of && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Replacement</div>}
                </td>
                <td className="p-3">{o.email}</td>
                <td className="p-3">{inr(Number(o.total))}</td>
                <td className="p-3 text-xs">{o.payment_method} · {paymentLabel(o)}</td>
                <td className="p-3">
                  <select value={o.status} onChange={(e) => update(o, e.target.value)} className="border border-border bg-transparent px-2 py-1 text-xs">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {o.return_status && o.return_status !== 'NONE' && (
                    <Link to="/admin/returns" className="block mt-1 text-[10px] uppercase tracking-widest underline">Return: {o.return_status}</Link>
                  )}
                </td>
                <td className="p-3"><ShippingCell o={o} retrying={retrying === o.id} onRetry={() => retry(o)} /></td>
                <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="p-3"><Link to={`/invoice/${o.id}`} target="_blank" className="text-xs underline">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
