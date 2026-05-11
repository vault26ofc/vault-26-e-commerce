import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { toast } from 'sonner';
import { downloadCsv, downloadJson } from '@/lib/exportCsv';
import { Download, Database } from 'lucide-react';

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', type: 'PERCENT', value: 10, min_order: 0 });
  const load = () => supabase.from('coupons').select('*').order('created_at', { ascending: false }).then(({ data }) => setCoupons(data || []));
  useEffect(() => { load(); }, []);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('coupons').insert({ ...form, code: form.code.toUpperCase(), type: form.type as any });
    if (error) return toast.error(error.message);
    toast.success('Coupon created'); setForm({ code: '', type: 'PERCENT', value: 10, min_order: 0 }); load();
  };
  const toggle = async (c: any) => { await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id); load(); };
  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-6">Coupons</h1>
      <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6 border border-border p-4">
        <input required placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="border border-border bg-transparent px-3 py-2 text-sm uppercase" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border border-border bg-transparent px-3 py-2 text-sm"><option>PERCENT</option><option>FLAT</option></select>
        <input type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="border border-border bg-transparent px-3 py-2 text-sm" />
        <input type="number" placeholder="Min order" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} className="border border-border bg-transparent px-3 py-2 text-sm" />
        <button className="bg-foreground text-background py-2 text-xs uppercase tracking-widest hover:bg-accent transition-colors">Create</button>
      </form>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px] md:min-w-0">
          <thead className="bg-secondary"><tr>{['Code','Type','Value','Min','Used','Active'].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-medium">{c.code}</td>
                <td className="p-3">{c.type}</td>
                <td className="p-3">{c.type === 'PERCENT' ? `${c.value}%` : inr(Number(c.value))}</td>
                <td className="p-3">{inr(Number(c.min_order))}</td>
                <td className="p-3">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                <td className="p-3"><button onClick={() => toggle(c)} className="text-xs underline">{c.is_active ? 'Disable' : 'Enable'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminCustomers() {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => { supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => setUsers(data || [])); }, []);
  const exportRows = () => {
    if (!users.length) return toast.error('Nothing to export');
    downloadCsv(`customers-${new Date().toISOString().slice(0,10)}.csv`, users.map((u) => ({ name: u.name, email: u.email, phone: u.phone, joined: u.created_at })));
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl">Customers <span className="text-muted-foreground text-sm font-sans">({users.length})</span></h1>
        <button onClick={exportRows} className="border border-border px-3 py-2 text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-secondary"><Download className="h-3.5 w-3.5" /> CSV</button>
      </div>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px] md:min-w-0">
          <thead className="bg-secondary"><tr>{['Name','Email','Phone','Joined'].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3 font-medium">{u.name || '—'}</td><td className="p-3">{u.email}</td><td className="p-3">{u.phone || '—'}</td>
                <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const [s, setS] = useState<Record<string, any>>({});
  useEffect(() => { supabase.from('settings').select('*').then(({ data }) => { const map: any = {}; data?.forEach((r: any) => map[r.key] = r.value); setS(map); }); }, []);
  const save = async (key: string, value: any) => {
    const { error } = await supabase.from('settings').update({ value }).eq('key', key);
    if (error) return toast.error(error.message);
    toast.success('Saved');
  };
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl md:text-3xl mb-6">Settings</h1>
      <DataExportPanel />
      <div className="max-w-xl">
      {[
        { k: 'cod_threshold', l: 'COD pre-payment threshold (₹)', t: 'number' },
        { k: 'cod_advance_percent', l: 'COD advance %', t: 'number' },
        { k: 'free_shipping_threshold', l: 'Free shipping threshold (₹)', t: 'number' },
        { k: 'shipping_fee', l: 'Shipping fee (₹)', t: 'number' },
        { k: 'whatsapp_number', l: 'WhatsApp number', t: 'text' },
      ].map(({ k, l, t }) => (
        <div key={k} className="mb-5">
          <label className="eyebrow">{l}</label>
          <input type={t} defaultValue={s[k] ?? ''} onBlur={(e) => save(k, t === 'number' ? Number(e.target.value) : e.target.value)}
            className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
        </div>
      ))}
      <div className="mb-5">
        <label className="eyebrow">Announcement banner</label>
        <input defaultValue={s.announcement?.text || ''} onBlur={(e) => save('announcement', { ...s.announcement, text: e.target.value })}
          placeholder="Banner text" className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
        <label className="text-xs mt-2 inline-flex items-center gap-2">
          <input type="checkbox" defaultChecked={!!s.announcement?.active} onChange={(e) => save('announcement', { ...s.announcement, active: e.target.checked })} /> Active
        </label>
      </div>
      </div>
    </div>
  );
}

function DataExportPanel() {
  const [busy, setBusy] = useState(false);
  const TABLES = ['products', 'product_variants', 'categories', 'brands', 'orders', 'order_items', 'profiles', 'coupons', 'admin_notifications', 'addresses', 'wishlist_items', 'settings'] as const;

  const exportTable = async (table: string) => {
    setBusy(true);
    const { data, error } = await supabase.from(table as any).select('*');
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.error(`${table} is empty`);
    downloadCsv(`${table}-${new Date().toISOString().slice(0,10)}.csv`, data as any);
  };

  const exportAll = async () => {
    setBusy(true);
    const out: Record<string, any> = { exported_at: new Date().toISOString() };
    for (const t of TABLES) {
      const { data } = await supabase.from(t as any).select('*');
      out[t] = data || [];
    }
    setBusy(false);
    downloadJson(`vault26-db-${new Date().toISOString().slice(0,10)}.json`, out);
    toast.success('Database exported');
  };

  return (
    <div className="border border-border p-5 mb-8">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="eyebrow flex items-center gap-2"><Database className="h-3 w-3" /> Data export</div>
          <p className="text-xs text-muted-foreground mt-1">Download individual tables as CSV or the entire database as JSON.</p>
        </div>
        <button disabled={busy} onClick={exportAll} className="bg-foreground text-background px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-50 flex items-center gap-2">
          <Download className="h-3.5 w-3.5" /> {busy ? 'Exporting…' : 'Export full DB'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABLES.map((t) => (
          <button key={t} disabled={busy} onClick={() => exportTable(t)} className="border border-border px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-secondary disabled:opacity-50">{t}</button>
        ))}
      </div>
    </div>
  );
}
