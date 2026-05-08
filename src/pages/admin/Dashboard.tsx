import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, pending: 0, lowStock: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data: orders } = await supabase.from('orders').select('*').gte('created_at', since.toISOString()).order('created_at', { ascending: false });
      const all = orders || [];
      const revenue = all.filter((o) => o.payment_status === 'PAID' || o.payment_method === 'COD').reduce((s, o) => s + Number(o.total), 0);
      const pending = all.filter((o) => o.status === 'PENDING').length;
      setStats((s) => ({ ...s, revenue, orders: all.length, pending }));
      setRecent(all.slice(0, 8));

      // trend
      const buckets: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); buckets[d.toISOString().slice(5, 10)] = 0; }
      all.forEach((o) => { const k = new Date(o.created_at).toISOString().slice(5, 10); if (k in buckets) buckets[k] += 1; });
      setTrend(Object.entries(buckets).map(([d, v]) => ({ d, orders: v })));

      const { data: vars } = await supabase.from('product_variants').select('id').lt('stock', 5);
      setStats((s) => ({ ...s, lowStock: vars?.length || 0 }));
    })();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-6 md:mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { l: 'Revenue (30d)', v: inr(stats.revenue) },
          { l: 'Orders (30d)', v: stats.orders },
          { l: 'Pending', v: stats.pending },
          { l: 'Low stock', v: stats.lowStock },
        ].map((k) => (
          <div key={k.l} className="border border-border p-4 md:p-5">
            <div className="eyebrow text-[9px] md:text-[10px]">{k.l}</div>
            <div className="font-display text-xl md:text-2xl mt-1 md:mt-2">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="border border-border p-4 md:p-5">
          <div className="eyebrow mb-4">Orders — last 30 days</div>
          <div className="h-48 md:h-56"><ResponsiveContainer><LineChart data={trend}><XAxis dataKey="d" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Line dataKey="orders" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
        </div>
        <div className="border border-border p-4 md:p-5">
          <div className="eyebrow mb-4">Revenue — last 30 days</div>
          <div className="h-48 md:h-56"><ResponsiveContainer><BarChart data={trend}><XAxis dataKey="d" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="orders" fill="hsl(var(--foreground))" /></BarChart></ResponsiveContainer></div>
        </div>
      </div>

      <div className="border border-border overflow-hidden">
        <div className="p-4 md:p-5 eyebrow border-b border-border">Recent orders</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px] md:min-w-0">
            <thead className="bg-secondary"><tr>{['Order','Customer','Total','Status','Date'].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-medium">{o.order_number}</td>
                  <td className="p-3 text-black/60">{o.email}</td>
                  <td className="p-3">{inr(Number(o.total))}</td>
                  <td className="p-3"><span className="text-[9px] md:text-[10px] uppercase tracking-widest bg-secondary px-2 py-1">{o.status}</span></td>
                  <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
