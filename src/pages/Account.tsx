import { useEffect, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSEO } from '@/lib/useSEO';
import { LogOut, Package, Heart, Settings, Trash2, ArrowRight, Pencil, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { fmtCalendarDate, fmtDate, inr, istDay } from '@/lib/format';
import { couponOfferText } from '@/lib/quote';

type Address = { id: string; label: string; full_name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; is_default: boolean };
type MyCoupon = { id: string; code: string; kind: string; type: 'PERCENT' | 'FLAT'; value: number; max_discount: number | null; min_order: number; expires_at: string | null; is_active: boolean; used_count: number; max_uses: number | null; per_user_limit: number | null };
type Pending = { title: string; body: React.ReactNode; confirmLabel?: string; run: () => Promise<void> } | null;

const EMPTY_ADDR = { label: 'Home', full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', is_default: false };
const LABELS = ['Home', 'Work', 'Other'];
const digits = (s: string) => s.replace(/\D/g, '');
const phoneOk = (s: string) => /^[6-9]\d{9}$/.test(digits(s).slice(-10)) && digits(s).length >= 10;

const label = 'text-[9px] tracking-[0.04em] uppercase font-ui font-bold text-black/40';
const line = 'w-full border-b border-black/10 bg-transparent py-4 text-sm font-ui outline-none focus:border-black transition-colors placeholder:text-black/20';
const box = 'border border-black/5 bg-muted/50 px-5 py-4 text-[10px] tracking-[0.04em] font-ui outline-none focus:border-black transition-colors';
const redBtn = 'bg-[#BB0006] text-white px-10 py-4 text-[10px] tracking-[0.04em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500 disabled:opacity-40';

export default function Account() {
  useSEO({ title: 'My Account — Vault 26', noindex: true });
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [dobDraft, setDobDraft] = useState('');
  const [pw, setPw] = useState({ next: '', again: '' });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editing, setEditing] = useState<(typeof EMPTY_ADDR & { id?: string }) | null>(null);
  const [coupons, setCoupons] = useState<MyCoupon[]>([]);
  const [usedIds, setUsedIds] = useState<Map<string, number>>(new Map());
  const [pending, setPending] = useState<Pending>(null);

  const loadAddresses = () => {
    if (!user) return;
    supabase.from('addresses').select('*').eq('user_id', user.id)
      .order('is_default', { ascending: false }).order('created_at', { ascending: false }).order('id')
      .then(({ data }) => setAddresses((data as unknown as Address[]) || []));
  };

  const loadProfile = () => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      setProfileForm({ name: data?.name || '', phone: data?.phone || '' });
    });
  };

  // useEffect must be before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadAddresses();
    // Only the customer's own codes are readable (RLS); there is no public coupon list.
    supabase.from('coupons' as any)
      .select('id, code, kind, type, value, max_discount, min_order, expires_at, is_active, used_count, max_uses, per_user_limit')
      .eq('assigned_user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setCoupons(((data as unknown as MyCoupon[]) || []).map((c) => ({ ...c, value: Number(c.value), min_order: Number(c.min_order), max_discount: c.max_discount ? Number(c.max_discount) : null }))));
    supabase.from('coupon_redemptions' as any).select('coupon_id').eq('user_id', user.id).then(({ data }) => {
      const m = new Map<string, number>();
      ((data as any[]) || []).forEach((r) => r.coupon_id && m.set(r.coupon_id, (m.get(r.coupon_id) || 0) + 1));
      setUsedIds(m);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) return <div className="min-h-screen bg-white" />;
  if (!user) return <Navigate to="/login" replace />;

  const confirm = (p: NonNullable<Pending>) => setPending(p);
  const runPending = async () => { const p = pending; setPending(null); if (p) await p.run(); };

  const saveProfile = () => {
    const name = profileForm.name.trim();
    const phone = digits(profileForm.phone).slice(-10);
    if (name.length < 2) return toast.error('Enter your name');
    if (profileForm.phone && !phoneOk(profileForm.phone)) return toast.error('Enter a 10-digit mobile number');
    confirm({
      title: 'Update your details?',
      body: <>Your name becomes <strong>{name}</strong>{phone ? <> and your mobile <strong>{phone}</strong></> : null}.</>,
      run: async () => {
        const { error } = await supabase.from('profiles').update({ name, phone: phone || null }).eq('id', user.id);
        if (error) return void toast.error(error.message);
        await supabase.auth.updateUser({ data: { name } });
        toast.success('Profile updated');
        loadProfile();
      },
    });
  };

  const saveDob = () => {
    if (!dobDraft) return toast.error('Pick your date of birth');
    if (dobDraft > istDay() || dobDraft < '1900-01-01') return toast.error('That date isn\'t valid');
    confirm({
      title: 'Save your birthday?',
      body: <>You can set it only once: <strong>{fmtCalendarDate(dobDraft)}</strong>. It can't be changed afterwards.</>,
      run: async () => {
        const { error } = await supabase.from('profiles').update({ dob: dobDraft } as any).eq('id', user.id);
        if (error) {
          if (error.message.includes('dob_locked')) return void toast.error('Your birthday is already set. Contact us to change it.');
          if (error.message.includes('dob_invalid')) return void toast.error('That date isn\'t valid');
          return void toast.error(error.message);
        }
        toast.success('Birthday saved');
        loadProfile();
      },
    });
  };

  const savePassword = () => {
    if (pw.next.length < 6) return toast.error('Use at least 6 characters');
    if (pw.next !== pw.again) return toast.error('The two passwords don\'t match');
    confirm({
      title: 'Change your password?',
      body: 'You will use the new password the next time you sign in.',
      confirmLabel: 'Change password',
      run: async () => {
        const { error } = await supabase.auth.updateUser({ password: pw.next });
        if (error) return void toast.error(error.message);
        setPw({ next: '', again: '' });
        toast.success('Password changed');
      },
    });
  };

  const saveAddress = async () => {
    if (!editing) return;
    const a = editing;
    if (!a.full_name.trim() || !a.line1.trim() || !a.city.trim() || !a.state.trim()) return toast.error('Please complete all required fields');
    if (!phoneOk(a.phone)) return toast.error('Enter a 10-digit mobile number');
    if (!/^\d{6}$/.test(a.pincode.trim())) return toast.error('Enter a 6-digit PIN code');
    const row = {
      label: a.label.trim() || 'Home', full_name: a.full_name.trim(), phone: digits(a.phone).slice(-10),
      line1: a.line1.trim(), line2: a.line2.trim() || null, city: a.city.trim(), state: a.state.trim(), pincode: a.pincode.trim(),
      is_default: a.is_default || addresses.length === 0,
    };
    const { error } = a.id
      ? await supabase.from('addresses').update(row as any).eq('id', a.id)
      : await supabase.from('addresses').insert({ ...row, user_id: user.id } as any);
    if (error) return toast.error(error.message);
    toast.success(a.id ? 'Address updated' : 'Address added to profile');
    setEditing(null);
    loadAddresses();
  };

  const makeDefault = async (id: string) => {
    const { error } = await supabase.from('addresses').update({ is_default: true } as any).eq('id', id);
    if (error) return toast.error(error.message);
    loadAddresses();
  };

  const deleteAddr = (a: Address) => confirm({
    title: 'Delete this address?',
    body: `${a.label}: ${a.line1}, ${a.city}`,
    confirmLabel: 'Delete',
    run: async () => {
      const { error } = await supabase.from('addresses').delete().eq('id', a.id);
      if (error) return void toast.error(error.message);
      loadAddresses();
    },
  });

  const couponStatus = (c: MyCoupon): { text: string; usable: boolean } => {
    const used = usedIds.get(c.id) || 0;
    if (c.per_user_limit && used >= c.per_user_limit) return { text: 'Used', usable: false };
    if (c.max_uses && c.used_count >= c.max_uses) return { text: 'Used', usable: false };
    if (c.expires_at && new Date(c.expires_at) <= new Date()) return { text: 'Expired', usable: false };
    if (!c.is_active) return { text: 'Unavailable', usable: false };
    return { text: c.expires_at ? `Valid till ${fmtDate(c.expires_at)}` : 'Ready to use', usable: true };
  };

  const todayIst = istDay();

  return (
    <div className="container-px pt-36 pb-24 min-h-screen bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-5xl mx-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <span className="eyebrow">Member Archive</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); toast.success('Signed out'); navigate('/'); }}
            className="flex items-center gap-2 text-[10px] tracking-[0.04em] uppercase font-ui font-bold text-black/40 hover:text-black transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} /> Sign Out
          </button>
        </div>
        <h1 className="uppercase display-2 mb-16">
          Hello, <span className="uppercase font-elegant ">{profile?.name || user?.email?.split('@')[0] || 'Member'}</span>
        </h1>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {[
            { to: '/orders', icon: Package, title: 'Order History', desc: 'Manage your archive purchases' },
            { to: '/wishlist', icon: Heart, title: 'Your Wishlist', desc: 'View saved archive pieces' },
            ...(isAdmin ? [{ to: '/admin', icon: Settings, title: 'Management', desc: 'Vault 26 admin controls' }] : [])
          ].map((item, i) => (
            <Link
              key={i}
              to={item.to}
              className="group border border-black/5 p-8 hover:border-black transition-all duration-500 bg-muted/30"
            >
              <item.icon className="h-5 w-5 text-accent mb-6 transition-transform group-hover:scale-110" strokeWidth={1.5} />
              <h3 className="text-sm font-ui font-bold tracking-[0.04em] uppercase mb-2">{item.title}</h3>
              <p className="text-[10px] text-black/40 tracking-[0.1em] uppercase font-ui">{item.desc}</p>
              <div className="mt-8 flex items-center gap-2 text-[9px] font-bold tracking-[0.04em] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                Access <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_450px] gap-24">
          <div className="space-y-20">
            {/* Profile Section */}
            <section>
              <div className="flex items-center justify-between mb-10 border-b border-black pb-4">
                <h2 className="text-[11px] tracking-[0.04em] uppercase font-ui font-bold">Identity Settings</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className={label}>Display Name</label>
                  <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className={line} placeholder="Enter display name" />
                </div>
                <div className="space-y-3">
                  <label className={label}>Mobile Contact (10 digits)</label>
                  <input value={profileForm.phone} inputMode="numeric" onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className={line} placeholder="98765 43210" />
                </div>
              </div>
              <button onClick={saveProfile} className={cn(redBtn, 'mt-12')}>Update Profile</button>

              <div className="mt-14 space-y-3">
                <label className={label}>Date of Birth</label>
                {profile?.dob ? (
                  <p className="text-sm font-ui py-4 border-b border-black/10">
                    {fmtCalendarDate(profile.dob)}
                    <span className="block text-[9px] tracking-[0.04em] uppercase text-black/40 mt-2">Set once — contact us if it needs correcting</span>
                  </p>
                ) : (
                  <div className="flex flex-wrap items-end gap-4">
                    <input type="date" value={dobDraft} max={todayIst} min="1900-01-01" onChange={(e) => setDobDraft(e.target.value)} className={cn(line, 'max-w-[220px]')} />
                    <button onClick={saveDob} className={redBtn}>Save Birthday</button>
                    <p className="w-full text-[9px] tracking-[0.04em] uppercase font-ui text-black/40">You can set your birthday only once.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Password */}
            <section>
              <div className="flex items-center justify-between mb-10 border-b border-black pb-4">
                <h2 className="text-[11px] tracking-[0.04em] uppercase font-ui font-bold">Password</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className={label}>New password</label>
                  <input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={line} placeholder="At least 6 characters" />
                </div>
                <div className="space-y-3">
                  <label className={label}>Repeat new password</label>
                  <input type="password" autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} className={line} />
                </div>
              </div>
              <button onClick={savePassword} disabled={!pw.next} className={cn(redBtn, 'mt-12')}>Change Password</button>
            </section>
          </div>

          {/* Address Section */}
          <section>
            <div className="flex items-center justify-between mb-10 border-b border-black pb-4">
              <h2 className="text-[11px] tracking-[0.04em] uppercase font-ui font-bold">Address Book</h2>
              <button
                onClick={() => setEditing(editing ? null : { ...EMPTY_ADDR })}
                className="text-[9px] tracking-[0.04em] uppercase font-ui font-bold hover:text-accent transition-colors"
              >
                {editing ? 'Close' : 'Add New'}
              </button>
            </div>

            <AnimatePresence>
              {editing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-12 space-y-4"
                >
                  <div className="flex flex-wrap gap-2">
                    {LABELS.map((l) => (
                      <button key={l} type="button" onClick={() => setEditing({ ...editing, label: l })}
                        className={cn('px-4 py-2 border text-[9px] tracking-[0.04em] uppercase font-ui font-bold', editing.label === l ? 'bg-black text-white border-black' : 'border-black/15')}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(['full_name', 'phone', 'pincode', 'city', 'state'] as const).map((k) => (
                      <input
                        key={k}
                        placeholder={k.replace('_', ' ').toUpperCase()}
                        value={editing[k]}
                        inputMode={k === 'phone' || k === 'pincode' ? 'numeric' : undefined}
                        onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                        className={box}
                      />
                    ))}
                  </div>
                  <input placeholder="STREET ADDRESS" value={editing.line1} onChange={(e) => setEditing({ ...editing, line1: e.target.value })} className={cn(box, 'w-full')} />
                  <input placeholder="SUITE / APT (OPTIONAL)" value={editing.line2} onChange={(e) => setEditing({ ...editing, line2: e.target.value })} className={cn(box, 'w-full')} />
                  <label className="flex items-center gap-2 text-[9px] tracking-[0.04em] uppercase font-ui font-bold">
                    <input type="checkbox" checked={editing.is_default} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} /> Use as default address
                  </label>
                  <div className="flex gap-4 pt-2">
                    <button onClick={saveAddress} className="flex-1 bg-[#BB0006] text-white py-4 text-[9px] tracking-[0.04em] uppercase font-bold">{editing.id ? 'Save Address' : 'Confirm Address'}</button>
                    <button onClick={() => setEditing(null)} className="px-8 border border-black/10 py-4 text-[9px] tracking-[0.04em] uppercase font-bold">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {addresses.length === 0 && !editing && (
                <p className="text-[10px] tracking-[0.04em] text-black/30 uppercase font-ui">No saved shipping locations.</p>
              )}
              {addresses.map((a) => (
                <div key={a.id} className="group border border-black/5 p-6 relative hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[9px] font-ui font-bold tracking-[0.04em] uppercase text-accent mb-2">{a.label}{a.is_default ? ' · Default' : ''}</div>
                      <div className="text-[11px] font-ui font-bold tracking-[0.04em] uppercase mb-2">{a.full_name}</div>
                      <div className="text-[10px] text-black/50 leading-relaxed font-ui uppercase tracking-[0.1em]">
                        {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br/>
                        {a.city}, {a.state} {a.pincode}<br/>
                        T: {a.phone}
                      </div>
                      {!a.is_default && (
                        <button onClick={() => makeDefault(a.id)} className="mt-3 text-[9px] tracking-[0.04em] uppercase font-ui font-bold underline underline-offset-2">Make default</button>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button aria-label="Edit address" onClick={() => setEditing({ id: a.id, label: a.label, full_name: a.full_name, phone: a.phone, line1: a.line1, line2: a.line2 || '', city: a.city, state: a.state, pincode: a.pincode, is_default: a.is_default })}
                        className="text-black/30 hover:text-black transition-colors"><Pencil className="h-4 w-4" strokeWidth={1} /></button>
                      <button aria-label="Delete address" onClick={() => deleteAddr(a)} className="text-black/20 hover:text-accent transition-colors">
                        <Trash2 className="h-4 w-4" strokeWidth={1} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* My Coupons */}
        <section className="mt-24">
          <div className="flex items-center justify-between mb-10 border-b border-black pb-4">
            <h2 className="text-[11px] tracking-[0.04em] uppercase font-ui font-bold">My Coupons</h2>
          </div>
          {coupons.length === 0 ? (
            <p className="text-[10px] tracking-[0.04em] text-black/30 uppercase font-ui">No personal coupons yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map((c) => {
                const st = couponStatus(c);
                return (
                  <div key={c.id} className={cn('border p-6', st.usable ? 'border-black/20' : 'border-black/5 opacity-60')}>
                    <div className="text-[9px] tracking-[0.04em] uppercase font-ui font-bold text-accent mb-3">
                      {c.kind === 'welcome' ? 'Welcome offer' : c.kind === 'birthday' ? 'Birthday gift' : 'Just for you'}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-lg font-ui font-bold tracking-[0.06em]">{c.code}</span>
                      {st.usable && (
                        <button aria-label="Copy code" onClick={() => { navigator.clipboard?.writeText(c.code); toast.success('Code copied'); }} className="text-black/40 hover:text-black">
                          <Copy className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] tracking-[0.04em] uppercase font-ui text-black/60 mt-2">
                      {couponOfferText(c, inr)}{c.min_order > 0 ? ` · min order ${inr(c.min_order)}` : ''}
                    </div>
                    <div className="text-[9px] tracking-[0.04em] uppercase font-ui font-bold mt-4">{st.text}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </motion.div>

      <ConfirmDialog
        open={!!pending}
        title={pending?.title || ''}
        body={pending?.body}
        confirmLabel={pending?.confirmLabel}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
