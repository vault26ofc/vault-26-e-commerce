import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, History, Minus, Plus, X } from 'lucide-react';
import { downloadCsv } from '@/lib/exportCsv';

type Row = {
  id: string; size: string | null; color: string | null; color_hex: string | null; sku: string | null; stock: number;
  products: { id: string; name: string; images: string[]; category_id: string | null; is_active: boolean } | null;
};
type Movement = { id: string; delta: number; stock_after: number; reason: string; created_at: string; order_id: string | null; orders: { order_number: string } | null };

const REASON_LABEL: Record<string, string> = {
  initial: 'Created', order: 'Sold', cancel: 'Order cancelled', replacement: 'Replacement sent', admin_edit: 'Edited in product',
};

export default function AdminInventory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [threshold, setThreshold] = useState(5);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [level, setLevel] = useState<'all' | 'low' | 'out'>('all');
  const [adjusting, setAdjusting] = useState<{ row: Row; mode: 'add' | 'remove' | 'set' } | null>(null);
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ row: Row; items: Movement[] } | null>(null);

  const load = () =>
    supabase.from('product_variants')
      .select('id, size, color, color_hex, sku, stock, products(id, name, images, category_id, is_active)')
      .order('stock')
      .then(({ data }) => setRows((data as unknown as Row[]) || []));

  useEffect(() => {
    load();
    supabase.from('categories').select('id, name').order('position').order('name').then(({ data }) => setCategories(data || []));
    supabase.from('settings').select('value').eq('key', 'low_stock_threshold').maybeSingle()
      .then(({ data }) => { if (data) setThreshold(Number(data.value) || 5); });
  }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (category !== 'ALL' && r.products?.category_id !== category) return false;
    if (level === 'out' && r.stock !== 0) return false;
    if (level === 'low' && !(r.stock > 0 && r.stock <= threshold)) return false;
    const q = search.trim().toLowerCase();
    if (q && ![r.products?.name, r.sku, r.size, r.color].some((x) => x?.toLowerCase().includes(q))) return false;
    return true;
  }), [rows, category, level, search, threshold]);

  const counts = useMemo(() => ({
    out: rows.filter((r) => r.stock === 0).length,
    low: rows.filter((r) => r.stock > 0 && r.stock <= threshold).length,
    units: rows.reduce((s, r) => s + r.stock, 0),
  }), [rows, threshold]);

  const openAdjust = (row: Row, mode: 'add' | 'remove' | 'set') => {
    setAdjusting({ row, mode });
    setAmount(mode === 'set' ? row.stock : 1);
    setReason(mode === 'add' ? 'Restock' : mode === 'remove' ? 'Damaged / lost' : 'Stock count');
  };

  const submitAdjust = async () => {
    if (!adjusting) return;
    const { row, mode } = adjusting;
    const delta = mode === 'add' ? amount : mode === 'remove' ? -amount : amount - row.stock;
    if (!Number.isInteger(amount) || amount < 0 || delta === 0) return toast.error('Enter a quantity that changes the stock');
    setBusy(true);
    const { data, error } = await supabase.rpc('adjust_stock', { p_variant_id: row.id, p_delta: delta, p_reason: reason });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Stock is now ${data}`);
    setAdjusting(null);
    load();
  };

  const openHistory = async (row: Row) => {
    const { data } = await supabase.from('inventory_movements')
      .select('id, delta, stock_after, reason, created_at, order_id, orders(order_number)')
      .eq('variant_id', row.id).order('created_at', { ascending: false }).limit(100);
    setHistory({ row, items: (data as unknown as Movement[]) || [] });
  };

  const label = (r: Row) => [r.size, r.color].filter(Boolean).join(' · ') || 'One size';

  const exportRows = () => downloadCsv(`inventory-${new Date().toISOString().slice(0, 10)}.csv`,
    filtered.map((r) => ({ product: r.products?.name, variant: label(r), sku: r.sku, stock: r.stock })));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">{counts.units} units across {rows.length} variants · low stock means {threshold} or fewer (change in Settings)</p>
        </div>
        <button onClick={exportRows} className="border border-border px-3 py-2 text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-secondary"><Download className="h-3.5 w-3.5" /> CSV</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5 max-w-xl">
        {([['all', 'All variants', rows.length], ['low', 'Low stock', counts.low], ['out', 'Sold out', counts.out]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setLevel(k)} className={`border p-3 text-left ${level === k ? 'border-foreground bg-secondary' : 'border-border hover:border-foreground'}`}>
            <div className={`text-2xl font-display ${k === 'out' && n ? 'text-destructive' : k === 'low' && n ? 'text-amber-700' : ''}`}>{n}</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{l}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, SKU, size, colour…" className="border border-border bg-transparent px-3 py-2 text-sm w-64" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-border bg-transparent px-3 py-2 text-sm">
          <option value="ALL">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-secondary"><tr>{['', 'Product', 'Variant', 'SKU', 'Stock', 'Adjust', ''].map((h, i) => <th key={i} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-2">{r.products?.images?.[0] ? <img src={r.products.images[0]} alt="" className="w-9 h-11 object-cover" /> : <div className="w-9 h-11 bg-secondary" />}</td>
                <td className="p-3">{r.products?.name}{r.products && !r.products.is_active && <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">Hidden</span>}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-2">
                    {r.color_hex && r.color && <span className="h-3 w-3 border border-border" style={{ background: r.color_hex }} />}
                    {label(r)}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{r.sku || '—'}</td>
                <td className={`p-3 font-medium ${r.stock === 0 ? 'text-destructive' : r.stock <= threshold ? 'text-amber-700' : ''}`}>
                  {r.stock}{r.stock === 0 ? ' · sold out' : r.stock <= threshold ? ' · low' : ''}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <button onClick={() => openAdjust(r, 'remove')} disabled={r.stock === 0} className="p-1.5 border border-border hover:bg-secondary disabled:opacity-30" aria-label="Remove stock"><Minus className="h-3.5 w-3.5" /></button>
                  <button onClick={() => openAdjust(r, 'add')} className="p-1.5 border border-border hover:bg-secondary ml-1" aria-label="Add stock"><Plus className="h-3.5 w-3.5" /></button>
                  <button onClick={() => openAdjust(r, 'set')} className="ml-2 text-xs underline">Set</button>
                </td>
                <td className="p-3 text-right"><button onClick={() => openHistory(r)} className="p-1.5 hover:bg-secondary" title="Stock history"><History className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">No variants match.</td></tr>}
          </tbody>
        </table>
      </div>

      {adjusting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAdjusting(null)}>
          <div className="bg-background w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-3">
              <div>
                <h3 className="font-display text-xl">{adjusting.mode === 'add' ? 'Add stock' : adjusting.mode === 'remove' ? 'Remove stock' : 'Set stock'}</h3>
                <div className="text-sm text-muted-foreground">{adjusting.row.products?.name} · {label(adjusting.row)} · now {adjusting.row.stock}</div>
              </div>
              <button onClick={() => setAdjusting(null)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">{adjusting.mode === 'set' ? 'New stock count' : 'Quantity'}
              <input type="number" min={0} value={amount} autoFocus onChange={(e) => setAmount(Math.floor(Number(e.target.value)))}
                onKeyDown={(e) => { if (e.key === 'Enter') submitAdjust(); }}
                className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">Reason (kept in history)
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
            </label>
            <div className="text-sm">
              New stock: <strong>{Math.max(0, adjusting.mode === 'add' ? adjusting.row.stock + amount : adjusting.mode === 'remove' ? adjusting.row.stock - amount : amount)}</strong>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAdjusting(null)} className="flex-1 border border-border py-3 text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={submitAdjust} disabled={busy} className="flex-1 bg-foreground text-background py-3 text-xs uppercase tracking-widest disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {history && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setHistory(null)}>
          <div className="w-full sm:max-w-md bg-background h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex justify-between items-start sticky top-0 bg-background">
              <div>
                <h3 className="font-display text-xl">Stock history</h3>
                <div className="text-sm text-muted-foreground">{history.row.products?.name} · {label(history.row)}</div>
              </div>
              <button onClick={() => setHistory(null)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="divide-y divide-border">
              {history.items.map((m) => (
                <div key={m.id} className="p-4 flex justify-between gap-3 text-sm">
                  <div>
                    <div>{REASON_LABEL[m.reason] ?? m.reason}{m.orders?.order_number && <span className="text-muted-foreground"> · {m.orders.order_number}</span>}</div>
                    <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className={m.delta > 0 ? 'text-green-700' : 'text-destructive'}>{m.delta > 0 ? `+${m.delta}` : m.delta}</div>
                    <div className="text-xs text-muted-foreground">→ {m.stock_after}</div>
                  </div>
                </div>
              ))}
              {!history.items.length && <div className="p-6 text-sm text-muted-foreground">No changes recorded yet (history starts from today).</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
