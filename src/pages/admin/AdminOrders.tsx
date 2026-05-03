import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { toast } from 'sonner';

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
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Orders</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-border bg-transparent px-3 py-2 text-sm">
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>{['Order','Email','Total','Payment','Status','Date'].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
