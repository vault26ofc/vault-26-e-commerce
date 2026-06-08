import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, Legend,
  Cell,
  PieChart, Pie,
  ComposedChart, Area, Line,
  CartesianGrid,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  PACKED: '#3b82f6',
  SHIPPED: '#8b5cf6',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
};
const PALETTE = ['#b11226', '#0f172a', '#6366f1', '#f59e0b', '#10b981', '#8b5cf6'];

type Period = 7 | 30 | 90;

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>(30);
  const [stats, setStats] = useState({
    revenue: 0, orders: 0, pending: 0, lowStock: 0,
    customers: 0, aov: 0, cancelled: 0, delivered: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);
  const [trend, setTrend] = useState<{ d: string; revenue: number; orders: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [topCategories, setTopCategories] = useState<{ name: string; value: number }[]>([]);
  const [cityData, setCityData] = useState<{ name: string; orders: number }[]>([]);
  const [stateData, setStateData] = useState<{ name: string; orders: number }[]>([]);
  const [paymentData, setPaymentData] = useState<{ name: string; value: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; revenue: number; qty: number }[]>([]);
  const [pipeline, setPipeline] = useState<{ name: string; count: number; fill: string }[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - period);

      const [
        { data: orders },
        { data: cats },
        { count: custCount },
        { data: lowStockVars },
      ] = await Promise.all([
        supabase.from('orders').select('*').gte('created_at', since.toISOString()).order('created_at', { ascending: false }),
        supabase.from('categories').select('name, products(id)'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('product_variants').select('id').lt('stock', 5),
      ]);

      const all = orders || [];
      const paid = all.filter(o => o.payment_status === 'PAID' || o.payment_method === 'COD');
      const revenue = paid.reduce((s, o) => s + Number(o.total), 0);
      const pending = all.filter(o => o.status === 'PENDING').length;
      const cancelled = all.filter(o => o.status === 'CANCELLED').length;
      const delivered = all.filter(o => o.status === 'DELIVERED').length;
      const aov = paid.length ? revenue / paid.length : 0;

      setStats({
        revenue, orders: all.length, pending, cancelled, delivered, aov,
        customers: custCount || 0,
        lowStock: lowStockVars?.length || 0,
      });
      setRecent(all.slice(0, 8));

      // ── Daily trend
      const buckets: Record<string, { orders: number; revenue: number }> = {};
      for (let i = period - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        buckets[d.toISOString().slice(5, 10)] = { orders: 0, revenue: 0 };
      }
      all.forEach(o => {
        const k = new Date(o.created_at).toISOString().slice(5, 10);
        if (k in buckets) {
          buckets[k].orders += 1;
          if (o.payment_status === 'PAID' || o.payment_method === 'COD') {
            buckets[k].revenue += Number(o.total);
          }
        }
      });
      setTrend(Object.entries(buckets).map(([d, v]) => ({ d, ...v })));

      // ── Status breakdown + pipeline
      const statusMap: Record<string, number> = {};
      all.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
      setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));
      setPipeline(['PENDING', 'PACKED', 'SHIPPED', 'DELIVERED'].map(s => ({
        name: s, count: statusMap[s] || 0, fill: STATUS_COLORS[s],
      })));

      // ── Geographic breakdown
      const cityMap: Record<string, number> = {};
      const stateMap: Record<string, number> = {};
      all.forEach(o => {
        const addr = o.shipping_address as any;
        if (addr?.city) cityMap[addr.city] = (cityMap[addr.city] || 0) + 1;
        if (addr?.state) stateMap[addr.state] = (stateMap[addr.state] || 0) + 1;
      });
      setCityData(
        Object.entries(cityMap)
          .map(([name, orders]) => ({ name, orders }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 10),
      );
      setStateData(
        Object.entries(stateMap)
          .map(([name, orders]) => ({ name, orders }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 8),
      );

      // ── Payment method
      const pmMap: Record<string, number> = {};
      all.forEach(o => { pmMap[o.payment_method] = (pmMap[o.payment_method] || 0) + 1; });
      setPaymentData(Object.entries(pmMap).map(([name, value]) => ({ name, value })));

      // ── Top products from order_items
      if (all.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('product_name, quantity, price_at_purchase')
          .in('order_id', all.map(o => o.id).slice(0, 500));
        const pMap: Record<string, { qty: number; revenue: number }> = {};
        (items || []).forEach(i => {
          if (!pMap[i.product_name]) pMap[i.product_name] = { qty: 0, revenue: 0 };
          pMap[i.product_name].qty += Number(i.quantity);
          pMap[i.product_name].revenue += Number(i.price_at_purchase) * Number(i.quantity);
        });
        setTopProducts(
          Object.entries(pMap)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8),
        );
      }

      // ── Categories
      setTopCategories(
        (cats || [])
          .map((c: any) => ({ name: c.name, value: c.products?.length || 0 }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6),
      );
    })();
  }, [period]);

  const cancelRate = stats.orders ? Math.round((stats.cancelled / stats.orders) * 100) : 0;
  const pipelineMax = Math.max(...pipeline.map(p => p.count), 1);

  const RevenueTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border text-[10px] p-2 shadow">
        <div className="font-medium mb-1">{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: {p.name === 'revenue' ? inr(p.value) : p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* ── Header + period selector */}
      <div className="flex items-center justify-between mb-6 md:mb-8 gap-4 flex-wrap">
        <h1 className="font-display text-2xl md:text-3xl">Dashboard</h1>
        <div className="flex gap-1">
          {([7, 30, 90] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-[10px] tracking-widest uppercase font-ui border transition-colors ${
                period === p ? 'bg-black text-white border-black' : 'border-border hover:border-black'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        {[
          { l: 'Revenue', v: inr(stats.revenue) },
          { l: 'Orders', v: stats.orders },
          { l: 'Avg Order', v: inr(Math.round(stats.aov)) },
          { l: 'Pending', v: stats.pending },
          { l: 'Delivered', v: stats.delivered },
          { l: 'Cancelled', v: `${cancelRate}%` },
          { l: 'Customers', v: stats.customers },
          { l: 'Low Stock', v: stats.lowStock },
        ].map(k => (
          <div key={k.l} className="border border-border p-3 md:p-4">
            <div className="eyebrow text-[9px]">{k.l}</div>
            <div className="font-display text-lg md:text-xl mt-1">{k.v}</div>
          </div>
        ))}
      </div>

      {/* ── Revenue & Orders trend */}
      <div className="border border-border p-4 md:p-5 mb-6">
        <div className="eyebrow mb-4">Revenue & Orders — {period}d</div>
        <div className="h-56 md:h-64">
          <ResponsiveContainer>
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="d" fontSize={10} />
              <YAxis
                yAxisId="rev"
                orientation="left"
                fontSize={10}
                tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
              />
              <YAxis yAxisId="ord" orientation="right" fontSize={10} />
              <Tooltip content={<RevenueTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                yAxisId="rev"
                type="monotone"
                dataKey="revenue"
                fill="rgba(177,18,38,0.08)"
                stroke="#b11226"
                strokeWidth={2}
                name="revenue"
              />
              <Line
                yAxisId="ord"
                type="monotone"
                dataKey="orders"
                stroke="#0f172a"
                strokeWidth={2}
                dot={false}
                name="orders"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Geographic: Cities + States */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="border border-border p-4 md:p-5">
          <div className="eyebrow mb-4">Orders by city (top 10)</div>
          <div className="h-64">
            {cityData.length ? (
              <ResponsiveContainer>
                <BarChart data={cityData} layout="vertical" margin={{ left: 4 }}>
                  <XAxis type="number" fontSize={10} />
                  <YAxis dataKey="name" type="category" fontSize={10} width={85} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#b11226" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground pt-4">
                No city data yet — appears once orders come in with shipping addresses.
              </p>
            )}
          </div>
        </div>
        <div className="border border-border p-4 md:p-5">
          <div className="eyebrow mb-4">Orders by state (top 8)</div>
          <div className="h-64">
            {stateData.length ? (
              <ResponsiveContainer>
                <BarChart data={stateData} layout="vertical" margin={{ left: 4 }}>
                  <XAxis type="number" fontSize={10} />
                  <YAxis dataKey="name" type="category" fontSize={10} width={95} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#0f172a" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground pt-4">
                No state data yet — appears once orders come in with shipping addresses.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Order pipeline + Payment method */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="border border-border p-4 md:p-5">
          <div className="eyebrow mb-4">Order pipeline</div>
          <div className="space-y-4 pt-1">
            {pipeline.map(stage => (
              <div key={stage.name}>
                <div className="flex justify-between items-center text-[10px] tracking-widest uppercase mb-1.5">
                  <span>{stage.name}</span>
                  <span className="font-bold tabular-nums">{stage.count}</span>
                </div>
                <div className="h-7 bg-secondary w-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${(stage.count / pipelineMax) * 100}%`,
                      backgroundColor: stage.fill,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-border p-4 md:p-5">
          <div className="eyebrow mb-4">Payment method split</div>
          <div className="h-52">
            {paymentData.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={paymentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    label={(e: any) => `${e.name} (${e.value})`}
                    labelLine={false}
                  >
                    {paymentData.map((p, i) => (
                      <Cell key={p.name} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground pt-4">No order data yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Top products + Status breakdown */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="border border-border p-4 md:p-5">
          <div className="eyebrow mb-4">Top products by revenue</div>
          <div className="h-64">
            {topProducts.length ? (
              <ResponsiveContainer>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 4 }}>
                  <XAxis
                    type="number"
                    fontSize={10}
                    tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                  />
                  <YAxis dataKey="name" type="category" fontSize={9} width={110} />
                  <Tooltip formatter={(v: any) => inr(v)} />
                  <Bar dataKey="revenue" fill="#b11226" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground pt-4">No product sales data yet.</p>
            )}
          </div>
        </div>
        <div className="border border-border p-4 md:p-5">
          <div className="eyebrow mb-4">Status breakdown</div>
          <div className="h-64">
            {statusData.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={75}
                    label={(e: any) => e.name}
                  >
                    {statusData.map(s => (
                      <Cell key={s.name} fill={STATUS_COLORS[s.name] || '#888'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground pt-4">No data yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Products by category */}
      <div className="border border-border p-4 md:p-5 mb-6">
        <div className="eyebrow mb-4">Products by category</div>
        <div className="h-48">
          {topCategories.length ? (
            <ResponsiveContainer>
              <BarChart data={topCategories}>
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--foreground))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted-foreground">No categories yet.</p>
          )}
        </div>
      </div>

      {/* ── Recent orders */}
      <div className="border border-border overflow-hidden">
        <div className="p-4 md:p-5 eyebrow border-b border-border">Recent orders</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px] md:min-w-0">
            <thead className="bg-secondary">
              <tr>
                {['Order', 'Customer', 'City', 'Total', 'Method', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left p-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(o => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-medium">{o.order_number}</td>
                  <td className="p-3 text-black/60">{o.email}</td>
                  <td className="p-3 text-black/50">{(o.shipping_address as any)?.city || '—'}</td>
                  <td className="p-3">{inr(Number(o.total))}</td>
                  <td className="p-3 text-[10px] uppercase tracking-widest">{o.payment_method}</td>
                  <td className="p-3">
                    <span
                      className="text-[9px] md:text-[10px] uppercase tracking-widest bg-secondary px-2 py-1"
                      style={{ color: STATUS_COLORS[o.status] }}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {!recent.length && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
