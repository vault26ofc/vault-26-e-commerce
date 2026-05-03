import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { toast } from 'sonner';

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
      <h1 className="font-display text-3xl mb-6">Coupons</h1>
      <form onSubmit={create} className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 border border-border p-4">
        <input required placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="border border-border bg-transparent px-3 py-2 text-sm uppercase" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border border-border bg-transparent px-3 py-2 text-sm"><option>PERCENT</option><option>FLAT</option></select>
        <input type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="border border-border bg-transparent px-3 py-2 text-sm" />
        <input type="number" placeholder="Min order" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} className="border border-border bg-transparent px-3 py-2 text-sm" />
        <button className="bg-foreground text-background text-xs uppercase tracking-widest">Create</button>
      </form>
      <div className="border border-border">
        <table className="w-full text-sm">
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
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Customers</h1>
      <div className="border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>{['Name','Email','Phone','Joined'].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">{u.name || '—'}</td><td className="p-3">{u.email}</td><td className="p-3">{u.phone || '—'}</td>
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
    <div className="max-w-xl">
      <h1 className="font-display text-3xl mb-6">Settings</h1>
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
  );
}
