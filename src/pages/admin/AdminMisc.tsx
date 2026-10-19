import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fmtCalendarDate, fmtDate, fmtDateTime, istDay } from '@/lib/format';
import { fetchAllRows } from '@/lib/fetchAll';
import { toast } from 'sonner';
import { downloadCsv, downloadJson } from '@/lib/exportCsv';
import { Download, Database } from 'lucide-react';
import { describeError } from '@/lib/errors';

export function AdminCustomers() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const load = () => fetchAllRows<any>(() => supabase.from('profiles').select('*').order('created_at', { ascending: false }).order('id'))
    .then(setUsers).catch((e) => toast.error(describeError(e)));
  useEffect(() => { load(); }, []);
  const exportRows = () => {
    if (!users.length) return toast.error('Nothing to export');
    downloadCsv(`customers-${istDay()}.csv`, users.map((u) => ({ name: u.name, email: u.email, phone: u.phone, birthday: u.dob || '', joined: fmtDateTime(u.created_at) })));
  };
  // Admins can set or correct a birthday (customers can only set theirs once).
  const setDob = async (u: any) => {
    const v = prompt(`Birthday for ${u.name || u.email} (YYYY-MM-DD, empty to clear):`, u.dob || '');
    if (v === null) return;
    const dob = v.trim() || null;
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return toast.error('Use the format YYYY-MM-DD');
    const { error } = await supabase.from('profiles').update({ dob } as any).eq('id', u.id);
    if (error) return toast.error(error.message.includes('dob_invalid') ? "That date isn't valid" : describeError(error));
    toast.success('Birthday saved');
    load();
  };
  const q = search.trim().toLowerCase();
  const shown = q ? users.filter((u) => [u.name, u.email, u.phone].some((x) => (x || '').toLowerCase().includes(q))) : users;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl md:text-3xl">Customers <span className="text-muted-foreground text-sm font-sans">({users.length})</span></h1>
        <div className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone…" className="border border-border bg-transparent px-3 py-2 text-sm w-48 sm:w-64" />
          <button onClick={exportRows} className="border border-border px-3 py-2 text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-secondary"><Download className="h-3.5 w-3.5" /> CSV</button>
        </div>
      </div>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px] md:min-w-0">
          <thead className="bg-secondary"><tr>{['Name','Email','Phone','Birthday','Joined'].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3 font-medium">{u.name || '—'}</td><td className="p-3">{u.email}</td><td className="p-3">{u.phone || '—'}</td>
                <td className="p-3"><button onClick={() => setDob(u)} className="hover:underline" title="Set or correct the birthday">{u.dob ? fmtCalendarDate(u.dob) : '—'}</button></td>
                <td className="p-3 text-muted-foreground">{fmtDate(u.created_at)}</td>
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
    setS((p) => ({ ...p, [key]: value }));
    const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
    if (error) return toast.error(describeError(error));
    toast.success('Saved');
  };
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl md:text-3xl mb-6">Settings</h1>
      <DataExportPanel />
      <div className="max-w-xl">
      {[
        { k: 'cod_min_order', l: 'COD minimum order (₹, 0 = no minimum)', t: 'number' },
        { k: 'return_window_days', l: 'Return window (days after delivery)', t: 'number' },
        { k: 'low_stock_threshold', l: 'Low stock warning at (units or fewer)', t: 'number' },
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
      <label className="mb-5 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={s.cod_enabled !== false} onChange={(e) => save('cod_enabled', e.target.checked)} />
        Cash on delivery available at checkout
      </label>
      <div className="mb-5">
        <label className="eyebrow">Announcement banner</label>
        <input defaultValue={s.announcement?.text || ''} onBlur={(e) => save('announcement', { ...s.announcement, text: e.target.value })}
          placeholder="Banner text" className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
        <label className="text-xs mt-2 inline-flex items-center gap-2">
          <input type="checkbox" defaultChecked={!!s.announcement?.active} onChange={(e) => save('announcement', { ...s.announcement, active: e.target.checked })} /> Active
        </label>
      </div>
      </div>

      <div className="border border-border p-5 mt-8 max-w-xl">
        <div className="eyebrow mb-4">Home — New Arrivals section</div>
        {[
          { k: 'eyebrow', l: 'Eyebrow tag', t: 'text' },
          { k: 'title', l: 'Title', t: 'text' },
          { k: 'subtitle', l: 'Subtitle', t: 'text' },
          { k: 'cta_label', l: 'CTA label', t: 'text' },
          { k: 'cta_href', l: 'CTA link', t: 'text' },
        ].map(({ k, l, t }) => (
          <div key={k} className="mb-4">
            <label className="text-xs uppercase tracking-widest text-muted-foreground">{l}</label>
            <input type={t} defaultValue={s.home_new_arrivals?.[k] ?? ''}
              onBlur={(e) => save('home_new_arrivals', { ...(s.home_new_arrivals || {}), [k]: e.target.value })}
              className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
          </div>
        ))}
        <label className="text-xs inline-flex items-center gap-2">
          <input type="checkbox" defaultChecked={s.home_new_arrivals?.enabled !== false}
            onChange={(e) => save('home_new_arrivals', { ...(s.home_new_arrivals || {}), enabled: e.target.checked })} />
          Section enabled on home page
        </label>
        <p className="text-[11px] text-muted-foreground mt-3">Products shown are <strong>featured</strong> products. Toggle "Featured" on any product in the Products section to include it.</p>
      </div>
    </div>
  );
}

/** Every row of a table, in pages (ordered by its primary key). */
const readAll = (table: string) =>
  fetchAllRows<any>(() => (supabase.from(table as any) as any).select('*').order(table === 'settings' ? 'key' : 'id'));

function DataExportPanel() {
  const [busy, setBusy] = useState(false);
  const TABLES = ['products', 'product_variants', 'categories', 'brands', 'orders', 'order_items', 'profiles', 'coupons', 'admin_notifications', 'addresses', 'wishlist_items', 'settings', 'coupon_redemptions'] as const;

  const exportTable = async (table: string) => {
    setBusy(true);
    let data: any[] = [];
    try { data = await readAll(table); } catch (error) { setBusy(false); return toast.error(describeError(error)); }
    setBusy(false);
    if (!data.length) return toast.error(`${table} is empty`);
    downloadCsv(`${table}-${istDay()}.csv`, data as any);
  };

  const exportAll = async () => {
    setBusy(true);
    const out: Record<string, any> = { exported_at: new Date().toISOString() };
    for (const t of TABLES) {
      out[t] = await readAll(t).catch(() => []);
    }
    setBusy(false);
    downloadJson(`vault26-db-${istDay()}.json`, out);
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
