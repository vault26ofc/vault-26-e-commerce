import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { describeError } from '@/lib/errors';
import { fetchAllRows } from '@/lib/fetchAll';
import { fmtCalendarDate, fmtDate, fromIstInput, inr, istDay, toIstInput } from '@/lib/format';
import { MultiSearchSelect, SearchSelect } from '@/components/admin/SearchSelect';

type Kind = 'general' | 'welcome' | 'birthday';
type Coupon = {
  id: string; code: string; kind: Kind; assigned_user_id: string | null; description: string | null;
  type: 'PERCENT' | 'FLAT'; value: number; max_discount: number | null; min_order: number;
  max_uses: number | null; used_count: number; per_user_limit: number | null; first_order_only: boolean;
  starts_at: string | null; expires_at: string | null; is_active: boolean; is_listed: boolean; created_at: string;
};
type Person = { id: string; name: string | null; email: string | null; phone?: string | null; dob?: string | null };
type Form = {
  id?: string; code: string; kind: Kind; assigned_user_id: string; description: string;
  type: 'PERCENT' | 'FLAT'; value: string; max_discount: string; min_order: string;
  max_uses: string; per_user_limit: string; first_order_only: boolean;
  starts_at: string; expires_at: string; is_active: boolean; is_listed: boolean;
  categories: string[]; excluded: string[];
};

const inputCls = 'w-full border border-border bg-transparent px-3 py-2 text-sm';
const btn = 'bg-foreground text-background px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-50';
const EMPTY: Form = {
  code: '', kind: 'general', assigned_user_id: '', description: '', type: 'PERCENT', value: '10', max_discount: '', min_order: '0',
  max_uses: '', per_user_limit: '', first_order_only: false, starts_at: '', expires_at: '', is_active: true, is_listed: true,
  categories: [], excluded: [],
};
const offer = (c: { type: string; value: number; max_discount: number | null }) =>
  c.type === 'PERCENT' ? `${c.value}%${c.max_discount ? ` (max ${inr(c.max_discount)})` : ''}` : inr(c.value);
const personLabel = (p?: Person) => (p ? [p.name, p.email].filter(Boolean).join(' · ') || p.id.slice(0, 8) : '—');

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs uppercase tracking-widest text-muted-foreground">
      {label}
      <div className="mt-1.5 normal-case tracking-normal text-foreground">{children}</div>
      {hint && <div className="mt-1 normal-case tracking-normal text-[11px]">{hint}</div>}
    </label>
  );
}

export function AdminCoupons() {
  const [tab, setTab] = useState<'coupons' | 'welcome' | 'birthday'>('coupons');
  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-6">Coupons</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {([['coupons', 'Coupons'], ['welcome', 'Welcome offer'], ['birthday', 'Birthday coupons']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 text-[11px] uppercase tracking-widest border ${tab === k ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'coupons' ? <CouponList /> : tab === 'welcome' ? <WelcomeOffer /> : <BirthdayCoupons />}
    </div>
  );
}
export default AdminCoupons;

// ─────────────────────────────────────────────────────────────────── coupons
function CouponList() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [scope, setScope] = useState<Map<string, { cats: string[]; ex: string[] }>>(new Map());
  const [categories, setCategories] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [filter, setFilter] = useState<'general' | 'welcome' | 'birthday' | 'all'>('general');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [cs, cats, exs] = await Promise.all([
        fetchAllRows<any>(() => supabase.from('coupons' as any).select('*').order('created_at', { ascending: false }).order('id')),
        fetchAllRows<any>(() => supabase.from('coupon_categories' as any).select('coupon_id, category_id').order('coupon_id').order('category_id')),
        fetchAllRows<any>(() => supabase.from('coupon_excluded_products' as any).select('coupon_id, product_id').order('coupon_id').order('product_id')),
      ]);
      setCoupons(cs.map((c) => ({ ...c, value: Number(c.value), min_order: Number(c.min_order), max_discount: c.max_discount === null ? null : Number(c.max_discount) })));
      const m = new Map<string, { cats: string[]; ex: string[] }>();
      const get = (id: string) => { if (!m.has(id)) m.set(id, { cats: [], ex: [] }); return m.get(id)!; };
      cats.forEach((r) => get(r.coupon_id).cats.push(r.category_id));
      exs.forEach((r) => get(r.coupon_id).ex.push(r.product_id));
      setScope(m);
    } catch (e) { toast.error(describeError(e)); }
  };

  useEffect(() => {
    load();
    supabase.from('categories').select('id, name, parent_id').order('position').order('name').then(({ data }) => setCategories((data as any) || []));
    fetchAllRows<any>(() => supabase.from('products').select('id, name').order('name').order('id')).then(setProducts).catch(() => {});
    fetchAllRows<Person>(() => supabase.from('profiles').select('id, name, email').order('created_at').order('id')).then(setPeople).catch(() => {});
  }, []);

  const byPerson = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name || '?';

  const shown = coupons.filter((c) => (filter === 'all' || c.kind === filter)
    && (!search || c.code.includes(search.toUpperCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase())));

  const edit = (c: Coupon) => setForm({
    id: c.id, code: c.code, kind: c.kind, assigned_user_id: c.assigned_user_id || '', description: c.description || '',
    type: c.type, value: String(c.value), max_discount: c.max_discount ? String(c.max_discount) : '', min_order: String(c.min_order),
    max_uses: c.max_uses ? String(c.max_uses) : '', per_user_limit: c.per_user_limit ? String(c.per_user_limit) : '',
    first_order_only: c.first_order_only, starts_at: toIstInput(c.starts_at), expires_at: toIstInput(c.expires_at),
    is_active: c.is_active, is_listed: c.is_listed, categories: scope.get(c.id)?.cats || [], excluded: scope.get(c.id)?.ex || [],
  });

  const save = async () => {
    if (!form) return;
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return toast.error('Codes use 2–40 letters, digits, - or _');
    const value = Number(form.value);
    if (!(value > 0)) return toast.error('The discount must be above 0');
    if (form.type === 'PERCENT' && value > 100) return toast.error('A percent discount can be at most 100');
    if (form.kind !== 'general' && !form.assigned_user_id) return toast.error('Welcome and birthday codes need an owner');
    setSaving(true);
    // Coupon + its category scope are saved in ONE transaction: a coupon saved without its
    // categories would apply to the whole store.
    const { error } = await supabase.rpc('save_coupon' as any, {
      p_id: form.id ?? null,
      p_fields: {
        code, kind: form.kind, assigned_user_id: form.assigned_user_id || null, description: form.description,
        type: form.type, value, max_discount: form.max_discount || null, min_order: form.min_order || 0,
        max_uses: form.max_uses || null, per_user_limit: form.per_user_limit || null, first_order_only: form.first_order_only,
        starts_at: fromIstInput(form.starts_at), expires_at: fromIstInput(form.expires_at), is_active: form.is_active, is_listed: form.is_listed,
      },
      p_categories: form.categories,
      p_excluded: form.excluded,
    });
    setSaving(false);
    if (error) return toast.error(describeError(error));
    toast.success('Coupon saved');
    setForm(null);
    load();
  };

  const toggle = async (c: Coupon) => {
    const { error } = await supabase.from('coupons').update({ is_active: !c.is_active } as any).eq('id', c.id);
    if (error) return toast.error(describeError(error));
    load();
  };

  const scopeText = (c: Coupon) => {
    const s = scope.get(c.id);
    const cats = s?.cats.length ? s.cats.map(catName).join(', ') : 'Whole store';
    return s?.ex.length ? `${cats} − ${s.ex.length} left out` : cats;
  };

  const status = (c: Coupon) => {
    if (!c.is_active) return 'Off';
    if (c.expires_at && new Date(c.expires_at) <= new Date()) return 'Expired';
    if (c.starts_at && new Date(c.starts_at) > new Date()) return 'Scheduled';
    if (c.max_uses && c.used_count >= c.max_uses) return 'Used up';
    return 'Live';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {(['general', 'welcome', 'birthday', 'all'] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 text-[11px] uppercase tracking-widest border ${filter === k ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground'}`}>
              {k === 'all' ? 'All' : k} ({k === 'all' ? coupons.length : coupons.filter((c) => c.kind === k).length})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code or note…" className="border border-border bg-transparent px-3 py-2 text-sm w-44 sm:w-56" />
          <button onClick={() => setForm({ ...EMPTY })} className={`${btn} flex items-center gap-2`}><Plus className="h-4 w-4" /> New coupon</button>
        </div>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-secondary"><tr>{['Code', 'Discount', 'Min order', 'Applies to', 'Used', 'Valid', 'Status', ''].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="border-t border-border align-top">
                <td className="p-3">
                  <div className="font-medium">{c.code}</div>
                  {c.assigned_user_id && <div className="text-[11px] text-muted-foreground">For {personLabel(byPerson.get(c.assigned_user_id))}</div>}
                  {c.description && <div className="text-[11px] text-muted-foreground italic">{c.description}</div>}
                </td>
                <td className="p-3">{offer(c)}{c.first_order_only && <div className="text-[11px] text-muted-foreground">First order only</div>}</td>
                <td className="p-3">{c.min_order > 0 ? inr(c.min_order) : '—'}</td>
                <td className="p-3 text-xs">{scopeText(c)}</td>
                <td className="p-3">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}{c.per_user_limit ? <div className="text-[11px] text-muted-foreground">{c.per_user_limit}× per customer</div> : null}</td>
                <td className="p-3 text-xs text-muted-foreground">{c.starts_at ? `From ${fmtDate(c.starts_at)}` : ''}{c.starts_at && c.expires_at ? <br /> : null}{c.expires_at ? `Until ${fmtDate(c.expires_at)}` : !c.starts_at ? 'No end date' : ''}</td>
                <td className="p-3">
                  <div className="text-xs">{status(c)}{c.kind === 'general' && !c.is_listed ? ' · hidden' : ''}</div>
                  <button onClick={() => toggle(c)} className="text-xs underline">{c.is_active ? 'Switch off' : 'Switch on'}</button>
                </td>
                <td className="p-3 text-right"><button onClick={() => edit(c)} className="p-1.5 hover:bg-secondary" title="Edit"><Pencil className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">No coupons here.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setForm(null)}>
          <div className="w-full sm:max-w-2xl bg-background h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-background z-10">
              <h2 className="font-display text-2xl">{form.id ? `Edit · ${form.code}` : 'New coupon'}</h2>
              <div className="flex items-center gap-2">
                <button onClick={save} disabled={saving} className={btn}>{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setForm(null)} aria-label="Close"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Code *" hint="Letters, digits, - and _. Saved in capitals.">
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} className={`${inputCls} uppercase`} />
                </Field>
                <Field label="Admin note" hint="Only admins see this.">
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Discount type">
                  <SearchSelect value={form.type} onChange={(v) => setForm({ ...form, type: v as Form['type'] })} options={[{ value: 'PERCENT', label: 'Percent off' }, { value: 'FLAT', label: 'Flat ₹ off' }]} />
                </Field>
                <Field label={form.type === 'PERCENT' ? 'Percent off *' : 'Rupees off *'}>
                  <input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Maximum discount (₹)" hint="Optional cap for percent coupons.">
                  <input type="number" min={0} value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Minimum order (₹)" hint="Counted on the items the coupon covers.">
                  <input type="number" min={0} value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Total uses" hint="Blank = unlimited.">
                  <input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Uses per customer" hint="Blank = unlimited.">
                  <input type="number" min={1} value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Starts (IST)">
                  <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Expires (IST)">
                  <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.first_order_only} onChange={(e) => setForm({ ...form, first_order_only: e.target.checked })} /> First order only</label>
                {form.kind === 'general' && !form.assigned_user_id && (
                  <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_listed} onChange={(e) => setForm({ ...form, is_listed: e.target.checked })} /> Show in the checkout coupon list</label>
                )}
              </div>
              <Field label={form.kind === 'general' ? 'Only for one customer (optional)' : 'Owner *'} hint="A personal code works only for its owner; for anyone else it answers like an unknown code.">
                <SearchSelect value={form.assigned_user_id} onChange={(v) => setForm({ ...form, assigned_user_id: v })} emptyLabel={form.kind === 'general' ? '— everyone —' : undefined}
                  placeholder="Search a customer…" options={people.map((p) => ({ value: p.id, label: personLabel(p) }))} />
              </Field>
              <div className="border-t border-border pt-5 space-y-4">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Applies to</div>
                <MultiSearchSelect values={form.categories} onChange={(categories) => setForm({ ...form, categories })} placeholder="Whole store — or search categories to limit it…"
                  options={categories.map((c) => ({ value: c.id, label: c.parent_id ? `${catName(c.parent_id)} › ${c.name}` : c.name }))} />
                <p className="text-[11px] text-muted-foreground">
                  {form.categories.length ? 'Products in these categories and their subcategories (main or extra category), including ones added later. The discount and minimum order count only these items.' : 'No categories: the whole store.'}
                </p>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Leave out these products</div>
                <MultiSearchSelect values={form.excluded} onChange={(excluded) => setForm({ ...form, excluded })} placeholder="Search products to leave out…"
                  options={products.map((p) => ({ value: p.id, label: p.name }))} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────── welcome offer
type Tier = { id?: string; label: string; discount_type: 'PERCENT' | 'FLAT'; discount_value: number; target_percent: number; is_active: boolean; position: number };
type Stats = { issued: number; used: number; tiers: { tier_id: string; label: string; issued: number; used: number; target_percent: number; is_active: boolean }[] };

function WelcomeOffer() {
  const [settings, setSettings] = useState<any>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: s }, { data: t }, { data: st }] = await Promise.all([
      supabase.from('welcome_offer_settings' as any).select('*').maybeSingle(),
      supabase.from('welcome_offer_tiers' as any).select('*').order('position').order('created_at'),
      supabase.rpc('welcome_offer_stats' as any),
    ]);
    setSettings(s || { enabled: false, code_prefix: 'VAULT', valid_days: 30, min_order: 0, max_discount: null, first_order_only: true });
    setTiers(((t as any[]) || []).map((x) => ({ ...x, discount_value: Number(x.discount_value) })));
    setStats(st as any);
  };
  useEffect(() => { load(); }, []);

  if (!settings) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const total = tiers.filter((t) => t.is_active).reduce((n, t) => n + (Number(t.target_percent) || 0), 0);
  const setTier = (i: number, patch: Partial<Tier>) => setTiers(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const save = async () => {
    if (settings.enabled && !tiers.some((t) => t.is_active && t.target_percent > 0)) return toast.error('Add at least one active tier with a share above 0');
    if (tiers.some((t) => !t.label.trim() || !(t.discount_value > 0))) return toast.error('Every tier needs a name and a discount');
    setSaving(true);
    const { error } = await supabase.rpc('save_welcome_offer' as any, {
      p_settings: settings,
      p_tiers: tiers.map((t, i) => ({ ...t, position: i })),
    });
    setSaving(false);
    if (error) return toast.error(describeError(error));
    toast.success('Welcome offer saved');
    load();
  };

  return (
    <div className="max-w-3xl space-y-8">
      <p className="text-sm text-muted-foreground">Every new account gets one personal code (like {settings.code_prefix || 'VAULT'}-7KQ2XA) from a tier picked by its share. It works only for that customer, once.</p>
      <div className="border border-border p-5 space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={!!settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} /> Give new customers a welcome code
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Code prefix"><input value={settings.code_prefix} onChange={(e) => setSettings({ ...settings, code_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} className={inputCls} /></Field>
          <Field label="Valid for (days)"><input type="number" min={1} max={365} value={settings.valid_days} onChange={(e) => setSettings({ ...settings, valid_days: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Minimum order (₹)"><input type="number" min={0} value={settings.min_order ?? 0} onChange={(e) => setSettings({ ...settings, min_order: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Maximum discount (₹)" hint="Blank = no cap."><input type="number" min={0} value={settings.max_discount ?? ''} onChange={(e) => setSettings({ ...settings, max_discount: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!settings.first_order_only} onChange={(e) => setSettings({ ...settings, first_order_only: e.target.checked })} /> First order only</label>
      </div>

      <div className="border border-border">
        <div className="flex items-center justify-between p-3 bg-secondary text-xs uppercase tracking-widest">
          <span>Tiers · shares add up to {total}</span>
          <button onClick={() => setTiers([...tiers, { label: '', discount_type: 'PERCENT', discount_value: 10, target_percent: 0, is_active: true, position: tiers.length }])} className="underline">+ Add tier</button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
            <th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Value</th><th className="p-2">Share</th><th className="p-2">Chance</th><th className="p-2">Active</th><th className="p-2" />
          </tr></thead>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={t.id ?? `new-${i}`} className="border-t border-border">
                <td className="p-2"><input value={t.label} onChange={(e) => setTier(i, { label: e.target.value })} placeholder="10% off" className={inputCls} /></td>
                <td className="p-2 w-32">
                  <select value={t.discount_type} onChange={(e) => setTier(i, { discount_type: e.target.value as Tier['discount_type'] })} className={inputCls}>
                    <option value="PERCENT">Percent</option><option value="FLAT">Flat ₹</option>
                  </select>
                </td>
                <td className="p-2 w-24"><input type="number" min={0} value={t.discount_value} onChange={(e) => setTier(i, { discount_value: Number(e.target.value) })} className={inputCls} /></td>
                <td className="p-2 w-24"><input type="number" min={0} value={t.target_percent} onChange={(e) => setTier(i, { target_percent: Math.max(0, Math.floor(Number(e.target.value))) })} className={inputCls} /></td>
                <td className="p-2 text-xs text-muted-foreground">{t.is_active && total ? `${Math.round((t.target_percent / total) * 100)}%` : '—'}</td>
                <td className="p-2"><input type="checkbox" checked={t.is_active} onChange={(e) => setTier(i, { is_active: e.target.checked })} /></td>
                <td className="p-2"><button onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="text-destructive p-1" aria-label="Remove tier"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {!tiers.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">No tiers yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <button onClick={save} disabled={saving} className={btn}>{saving ? 'Saving…' : 'Save welcome offer'}</button>

      {stats && (
        <div className="border border-border p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Results</div>
          <div className="text-sm mb-3">{stats.issued} codes issued · {stats.used} used{stats.issued ? ` (${Math.round((stats.used / stats.issued) * 100)}%)` : ''}</div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground"><th className="p-2">Tier</th><th className="p-2">Issued</th><th className="p-2">Actual share</th><th className="p-2">Used</th></tr></thead>
            <tbody>
              {stats.tiers.map((t) => (
                <tr key={t.tier_id} className="border-t border-border">
                  <td className="p-2">{t.label}{!t.is_active && <span className="text-muted-foreground"> (off)</span>}</td>
                  <td className="p-2">{t.issued}</td>
                  <td className="p-2">{stats.issued ? `${Math.round((t.issued / stats.issued) * 100)}%` : '—'}</td>
                  <td className="p-2">{t.used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────── birthday coupons
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function BirthdayCoupons() {
  const year = Number(istDay().slice(0, 4));
  const [month, setMonth] = useState(Number(istDay().slice(5, 7)));
  const [people, setPeople] = useState<Person[]>([]);
  const [issued, setIssued] = useState<Map<string, string>>(new Map());
  const [picked, setPicked] = useState<string[]>([]);
  const [offerForm, setOfferForm] = useState({ type: 'PERCENT', value: 15, max_discount: '', min_order: 0, valid_days: 30 });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [ps, cs] = await Promise.all([
        fetchAllRows<Person>(() => supabase.from('profiles').select('id, name, email, phone, dob').not('dob', 'is', null).order('id')),
        fetchAllRows<any>(() => supabase.from('coupons' as any).select('id, code, assigned_user_id').eq('kind', 'birthday').eq('bday_year', year).order('id')),
      ]);
      setPeople(ps);
      setIssued(new Map(cs.map((c) => [c.assigned_user_id, c.code])));
    } catch (e) { toast.error(describeError(e)); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setPicked([]); }, [month]);

  const inMonth = people
    .filter((p) => p.dob && Number(p.dob.slice(5, 7)) === month)
    .sort((a, b) => a.dob!.slice(8, 10).localeCompare(b.dob!.slice(8, 10)));
  const eligible = inMonth.filter((p) => !issued.has(p.id));

  const release = async () => {
    if (!picked.length) return toast.error('Tick at least one customer');
    if (!(offerForm.value > 0)) return toast.error('Set the discount');
    if (!confirm(`Create ${picked.length} birthday code${picked.length === 1 ? '' : 's'}?`)) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('issue_birthday_coupons' as any, {
      p_user_ids: picked, p_discount_type: offerForm.type, p_discount_value: offerForm.value,
      p_max_discount: offerForm.max_discount === '' ? null : Number(offerForm.max_discount),
      p_min_order: offerForm.min_order, p_valid_days: offerForm.valid_days,
    });
    setBusy(false);
    if (error) return toast.error(describeError(error));
    toast.success(`${data} birthday code${data === 1 ? '' : 's'} created`);
    setPicked([]);
    load();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <p className="text-sm text-muted-foreground">One single-use BDAY code per customer per year ({year}, IST). Customers see it under Account → My Coupons.</p>
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Birth month">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${inputCls} w-44`}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <span className="text-sm text-muted-foreground pb-2">{inMonth.length} customer{inMonth.length === 1 ? '' : 's'} · {eligible.length} without a {year} code</span>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-secondary"><tr>
            <th className="p-3 w-10"><input type="checkbox" checked={eligible.length > 0 && picked.length === eligible.length}
              onChange={(e) => setPicked(e.target.checked ? eligible.map((p) => p.id) : [])} aria-label="Tick all" /></th>
            {['Customer', 'Birthday', `${year} code`].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {inMonth.map((p) => {
              const code = issued.get(p.id);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3"><input type="checkbox" disabled={!!code} checked={picked.includes(p.id)}
                    onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))} /></td>
                  <td className="p-3">{p.name || '—'}<div className="text-[11px] text-muted-foreground">{p.email}</div></td>
                  <td className="p-3">{fmtCalendarDate(p.dob)}</td>
                  <td className="p-3 text-xs">{code || '—'}</td>
                </tr>
              );
            })}
            {!inMonth.length && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">No customers with a birthday in {MONTHS[month - 1]}.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="border border-border p-5 space-y-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Offer</div>
        <div className="grid sm:grid-cols-5 gap-3">
          <Field label="Type">
            <select value={offerForm.type} onChange={(e) => setOfferForm({ ...offerForm, type: e.target.value })} className={inputCls}>
              <option value="PERCENT">Percent</option><option value="FLAT">Flat ₹</option>
            </select>
          </Field>
          <Field label="Value"><input type="number" min={0} value={offerForm.value} onChange={(e) => setOfferForm({ ...offerForm, value: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Max ₹ off"><input type="number" min={0} value={offerForm.max_discount} onChange={(e) => setOfferForm({ ...offerForm, max_discount: e.target.value })} className={inputCls} /></Field>
          <Field label="Min order ₹"><input type="number" min={0} value={offerForm.min_order} onChange={(e) => setOfferForm({ ...offerForm, min_order: Number(e.target.value) })} className={inputCls} /></Field>
          <Field label="Valid days"><input type="number" min={1} max={365} value={offerForm.valid_days} onChange={(e) => setOfferForm({ ...offerForm, valid_days: Number(e.target.value) })} className={inputCls} /></Field>
        </div>
        <button onClick={release} disabled={busy || !picked.length} className={btn}>{busy ? 'Releasing…' : `Release to ${picked.length} customer${picked.length === 1 ? '' : 's'}`}</button>
      </div>
    </div>
  );
}
