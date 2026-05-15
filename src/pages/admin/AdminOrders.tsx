import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { toast } from 'sonner';
import { downloadCsv } from '@/lib/exportCsv';
import { Download } from 'lucide-react';

const STATUSES = ['PENDING','PACKED','SHIPPED','DELIVERED','CANCELLED'] as const;

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const load = () => supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => setOrders(data || []));
  useEffect(() => { load(); }, []);
  const update = async (id: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status: status as any }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Status updated'); load();
  };
  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);

  const exportRows = () => {
    if (!filtered.length) return toast.error('Nothing to export');
    downloadCsv(`orders-${new Date().toISOString().slice(0,10)}.csv`,
      filtered.map((o) => ({ order_number: o.order_number, email: o.email, status: o.status, payment_method: o.payment_method, payment_status: o.payment_status, subtotal: o.subtotal, shipping: o.shipping, total: o.total, created_at: o.created_at })));
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
          <thead className="bg-secondary"><tr>{['Order','Email','Total','Payment','Status','Date','Invoice'].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3">{o.order_number}</td>
                <td className="p-3">{o.email}</td>
                <td className="p-3">{inr(Number(o.total))}</td>
                <td className="p-3 text-xs">{o.payment_method} · {o.payment_status}</td>
                <td className="p-3">
                  <select value={o.status} onChange={(e) => update(o.id, e.target.value)} className="border border-border bg-transparent px-2 py-1 text-xs">
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
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
