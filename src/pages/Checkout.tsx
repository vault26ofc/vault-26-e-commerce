import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/store';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronRight, ArrowLeft, ShieldCheck, Truck, CreditCard, Ticket } from 'lucide-react';
import { triggerOrderNotification } from '@/lib/whatsapp';
import { readFunctionError } from '@/lib/payment';
import { cartPayload, couponOfferText, fetchAvailableCoupons, fetchQuote, problemText, useQuote, type AvailableCoupon } from '@/lib/quote';
import { imageProps } from '@/lib/image';

const digits = (s: string) => s.replace(/\D/g, '');

const addressSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter the full name').max(80),
  phone: z.string().transform((s) => digits(s).slice(-10)).refine((s) => /^[6-9]\d{9}$/.test(s), 'Enter a 10-digit mobile number'),
  email: z.string().trim().email('Enter a valid email').max(120),
  line1: z.string().trim().min(3, 'Enter the street address').max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'Enter the city').max(60),
  state: z.string().trim().min(2, 'Enter the state').max(60),
  pincode: z.string().trim().refine((s) => /^\d{6}$/.test(s), 'Enter a 6-digit PIN code'),
});

type Addr = { full_name: string; phone: string; email: string; line1: string; line2: string; city: string; state: string; pincode: string };
type SavedAddress = { id: string; label: string; full_name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; is_default: boolean };

const EMPTY: Addr = { full_name: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pincode: '' };
const LABELS = ['Home', 'Work', 'Other'];

export default function Checkout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, couponCode, clear, setCoupon, setQty, remove } = useCart();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [addr, setAddr] = useState<Addr>(EMPTY);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [selected, setSelected] = useState<string>('new');
  const [saveAddr, setSaveAddr] = useState(true);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [payment, setPayment] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [placing, setPlacing] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [coupons, setCoupons] = useState<AvailableCoupon[]>([]);
  const [showCoupons, setShowCoupons] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const { quote } = useQuote(items, couponCode, 'RAZORPAY', refresh);

  const itemsKey = items.map((i) => `${i.variantId}:${i.quantity}`).join(',');

  // Saved addresses: the default one is picked automatically.
  useEffect(() => {
    if (!user) return;
    setAddr((a) => ({ ...a, email: a.email || user.email || '' }));
    supabase.from('addresses').select('*').eq('user_id', user.id)
      .order('is_default', { ascending: false }).order('created_at', { ascending: false }).order('id')
      .then(({ data }) => {
        const list = (data as unknown as SavedAddress[]) || [];
        setSaved(list);
        if (list.length) pickSaved(list[0]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!items.length) { setCoupons([]); return; }
    let cancelled = false;
    fetchAvailableCoupons(items).then((c) => { if (!cancelled) setCoupons(c); }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, user?.id]);

  const pickSaved = (a: SavedAddress) => {
    setSelected(a.id);
    setAddr((cur) => ({ ...cur, full_name: a.full_name, phone: a.phone, line1: a.line1, line2: a.line2 || '', city: a.city, state: a.state, pincode: a.pincode }));
  };
  const pickNew = () => {
    setSelected('new');
    setAddr((cur) => ({ ...EMPTY, email: cur.email }));
  };

  if (items.length === 0) {
    return (
      <div className="container-px py-48 text-center bg-white min-h-screen flex flex-col items-center justify-center">
        <span className="eyebrow block mb-8">Empty Collection</span>
        <h1 className="uppercase display-2 mb-12 font-elegant">Your bag awaits its first piece.</h1>
        <Link to="/shop" className="border border-black px-12 py-5 text-[11px] tracking-[0.04em] uppercase font-ui font-bold hover:bg-[#AA0001] hover:text-white transition-all duration-500">
          Discover Archives
        </Link>
      </div>
    );
  }

  if (!authLoading && !user) {
    return (
      <div className="container-px py-48 text-center bg-white min-h-screen flex flex-col items-center justify-center">
        <span className="eyebrow block mb-8">Secure Checkout</span>
        <h1 className="uppercase display-2 mb-6 font-elegant">Sign in to check out</h1>
        <p className="text-[11px] tracking-[0.04em] uppercase font-ui text-black/60 mb-12">Your bag is saved. Sign in or create an account to place the order.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/login?next=/checkout" className="bg-[#BB0006] text-white px-12 py-5 text-[11px] tracking-[0.04em] uppercase font-ui font-bold hover:bg-accent transition-colors">Sign in</Link>
          <Link to="/register?next=/checkout" className="border border-black px-12 py-5 text-[11px] tracking-[0.04em] uppercase font-ui font-bold hover:bg-[#AA0001] hover:text-white transition-colors">Create account</Link>
        </div>
      </div>
    );
  }

  const sub = quote?.subtotal ?? items.reduce((n, i) => n + i.price * i.quantity, 0);
  const discount = quote?.discount ?? 0;
  const shipping = quote?.shipping ?? 0;
  const total = quote?.total ?? sub;
  const codAllowed = !!quote?.cod.allowed;
  const codAdvance = quote?.cod.advance ?? 0;
  // COD can become unavailable after it was chosen (e.g. a coupon lowers the total); fall back to online payment.
  const method: 'RAZORPAY' | 'COD' = payment === 'COD' && !codAllowed ? 'RAZORPAY' : payment;
  const linePrice = (variantId: string, fallback: number) => quote?.lines.find((l) => l.variant_id === variantId)?.price ?? fallback;
  const problem = (variantId: string) => quote?.unavailable.find((u) => u.variant_id === variantId);
  const couponBroken = !!(couponCode && quote?.coupon && !quote.coupon.ok);

  const applyCoupon = async (raw: string) => {
    const c = raw.trim().toUpperCase();
    if (!c) return;
    setApplying(true);
    try {
      const q = await fetchQuote(items, c);
      if (!q.coupon?.ok) { toast.error(q.coupon?.message || 'This coupon can\'t be used'); return; }
      setCoupon(c);
      setCodeInput('');
      setShowCoupons(false);
      toast.success(`Coupon applied: −${inr(q.discount)}`);
    } catch {
      toast.error('Could not check that coupon. Try again.');
    } finally {
      setApplying(false);
    }
  };

  const loadRazorpay = () => new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const payWithRazorpay = (order: { id: string; order_number: string }) => new Promise<void>(async (resolve, reject) => {
    const ok = await loadRazorpay();
    if (!ok) return reject(new Error('Razorpay failed to load'));
    const { data, error } = await supabase.functions.invoke('razorpay-create-order', { body: { order_id: order.id } });
    if (error || !data?.order) return reject(new Error(error ? await readFunctionError(error) : 'Could not create payment'));
    const rzp = new (window as any).Razorpay({
      key: data.key_id,
      amount: data.order.amount,
      currency: data.order.currency,
      order_id: data.order.id,
      name: 'Vault 26',
      description: `Order ${order.order_number}`,
      prefill: { name: addr.full_name, email: addr.email, contact: addr.phone },
      theme: { color: '#BB0006' },
      handler: async (resp: any) => {
        const { data: v, error: ve } = await supabase.functions.invoke('razorpay-verify-payment', {
          body: { ...resp, order_id: order.id },
        });
        if (ve || !v?.success) return reject(new Error(ve ? await readFunctionError(ve) : 'Payment verification failed'));
        resolve();
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    // The modal stays open after a failed attempt so the customer can retry; just tell them why.
    rzp.on('payment.failed', (r: any) => toast.error(r?.error?.description || 'Payment failed. Try again or use another method.'));
    rzp.open();
  });

  const placeOrder = async () => {
    const parsed = addressSchema.safeParse(addr);
    if (!parsed.success) { setStep(1); toast.error(parsed.error.issues[0].message); return; }
    const address = { ...parsed.data, line2: parsed.data.line2 || '' };
    setPlacing(true);
    try {
      // Stock is checked again right before payment opens.
      const { data: short, error: stockError } = await supabase.rpc('check_cart_stock' as any, {
        p_items: cartPayload(items).map((l) => ({ variant_id: l.variant_id, qty: l.quantity })),
      });
      if (stockError) throw stockError;
      if (Array.isArray(short) && short.length) {
        setRefresh((n) => n + 1);
        toast.error(short.length === 1 ? 'An item in your bag no longer has enough stock — see your bag.' : `${short.length} items in your bag no longer have enough stock — see your bag.`);
        return;
      }
      if (couponBroken) { toast.error(quote!.coupon!.message || 'Remove the coupon to continue'); return; }

      // Server-side order creation: prices come from the database, never from the browser.
      const { data: orderData, error } = await supabase.rpc('create_order', {
        p_user_id: user?.id ?? null,
        p_email: address.email,
        p_shipping_address: address,
        p_items: cartPayload(items),
        p_coupon_code: couponCode ?? null,
        p_payment_method: method,
      });
      if (error) throw error;
      const order = orderData as { id: string; order_number: string; total: number; cod_advance_amount: number; payment_method: string };

      if (user && selected === 'new' && saveAddr) {
        const { full_name, phone, line1, line2, city, state, pincode } = address;
        await supabase.from('addresses' as any).insert({ user_id: user.id, label: addrLabel, full_name, phone, line1, line2: line2 || null, city, state, pincode, is_default: saved.length === 0 });
      }

      if (method === 'RAZORPAY' || Number(order.cod_advance_amount) > 0) {
        await payWithRazorpay(order);
      }

      if (address.phone) {
        triggerOrderNotification('order_placed', { ...order, email: address.email, shipping_address: address, user_id: user?.id }, address.phone).catch(() => {});
      }
      toast.success('Order secured in the archive');
      clear();
      navigate(`/order-success/${order.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Could not finalize archive order');
      setRefresh((n) => n + 1);
    } finally {
      setPlacing(false);
    }
  };

  const fieldCls = 'w-full border-b border-black/20 bg-transparent py-4 text-sm font-ui outline-none focus:border-black transition-colors';

  return (
    <div className="container-px pt-24 pb-12 md:py-24 min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[1fr_480px] gap-12 lg:gap-32">
        <div className="flex flex-col">
          <header className="mb-10 md:mb-16">
            <span className="eyebrow block mb-3 md:mb-4">Secure Checkout</span>
            <h1 className="uppercase display-2 font-elegant text-3xl md:text-5xl">Finalize <span className="text-accent">Piece</span></h1>
          </header>

          {/* Editorial Stepper */}
          <div className="flex items-center gap-6 md:gap-12 mb-10 md:mb-16 border-b border-black/10 pb-6 md:pb-8 overflow-x-auto scrollbar-hide">
            {[
              { id: 1, label: 'Delivery Location', icon: Truck },
              { id: 2, label: 'Payment Method', icon: CreditCard },
              { id: 3, label: 'Final Review', icon: ShieldCheck }
            ].map((s) => (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-4 whitespace-nowrap transition-all duration-500',
                  step === s.id ? 'opacity-100' : 'opacity-20 grayscale'
                )}
              >
                <span className={cn(
                  'h-7 w-7 md:h-8 md:w-8 rounded-full border border-black flex items-center justify-center text-[9px] md:text-[10px] font-ui font-bold shrink-0',
                  step === s.id && 'bg-[#BB0006] text-white'
                )}>
                  {s.id}
                </span>
                <span className="text-[9px] md:text-[10px] tracking-[0.04em] md:tracking-[0.04em] uppercase font-ui font-bold">{s.label}</span>
                {s.id < 3 && <div className="w-8 md:w-12 h-[1px] bg-black/15 shrink-0" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={(e) => { e.preventDefault();
                  const r = addressSchema.safeParse(addr);
                  if (!r.success) { toast.error(r.error.issues[0].message); return; }
                  setStep(2);
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 md:gap-y-8"
              >
                {saved.length > 0 && (
                  <div className="md:col-span-2">
                    <div className="text-[9px] tracking-[0.04em] uppercase font-ui font-bold text-black/50 mb-3">Saved addresses</div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {saved.map((a) => (
                        <button type="button" key={a.id} onClick={() => pickSaved(a)}
                          className={cn('text-left border p-4 transition-colors', selected === a.id ? 'border-black bg-muted/30' : 'border-black/10 hover:border-black/40')}>
                          <div className="text-[10px] tracking-[0.04em] uppercase font-ui font-bold mb-1">{a.label}{a.is_default ? ' · Default' : ''}</div>
                          <div className="text-[10px] text-black/60 leading-relaxed font-ui uppercase tracking-[0.06em]">
                            {a.full_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pincode}
                          </div>
                        </button>
                      ))}
                      <button type="button" onClick={pickNew}
                        className={cn('text-left border p-4 text-[10px] tracking-[0.04em] uppercase font-ui font-bold transition-colors', selected === 'new' ? 'border-black bg-muted/30' : 'border-black/10 hover:border-black/40')}>
                        + New address
                      </button>
                    </div>
                  </div>
                )}
                {[
                  { k: 'full_name', l: 'Collector Name', c: 'md:col-span-2' },
                  { k: 'email', l: 'Identity Email', c: 'md:col-span-2' },
                  { k: 'phone', l: 'Contact Number', c: 'md:col-span-1' },
                  { k: 'pincode', l: 'Postal Zone', c: 'md:col-span-1' },
                  { k: 'line1', l: 'Street Address', c: 'md:col-span-2' },
                  { k: 'line2', l: 'Suite / Apt (Optional)', c: 'md:col-span-2' },
                  { k: 'city', l: 'City Archive', c: 'md:col-span-1' },
                  { k: 'state', l: 'State Territory', c: 'md:col-span-1' }
                ].map((field) => (
                  <div key={field.k} className={field.c}>
                    <label className="text-[9px] tracking-[0.04em] uppercase font-ui font-bold text-black/50 mb-2 block">{field.l}</label>
                    <input
                      value={(addr as any)[field.k]}
                      onChange={(e) => { setAddr({ ...addr, [field.k]: e.target.value }); if (field.k !== 'email' && selected !== 'new') setSelected('new'); }}
                      inputMode={field.k === 'phone' || field.k === 'pincode' ? 'numeric' : undefined}
                      className={fieldCls}
                      placeholder={`Enter ${field.l.toLowerCase()}`}
                    />
                  </div>
                ))}
                {selected === 'new' && (
                  <div className="md:col-span-2 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-[10px] tracking-[0.04em] uppercase font-ui font-bold">
                      <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} /> Save this address
                    </label>
                    {saveAddr && LABELS.map((l) => (
                      <button type="button" key={l} onClick={() => setAddrLabel(l)}
                        className={cn('px-3 py-1.5 border text-[9px] tracking-[0.04em] uppercase font-ui font-bold', addrLabel === l ? 'bg-black text-white border-black' : 'border-black/20')}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
                <div className="md:col-span-2 pt-6 md:pt-8">
                  <button type="submit" className="w-full bg-[#BB0006] text-white py-5 md:py-6 text-[10px] md:text-[11px] tracking-[0.04em] md:tracking-[0.04em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500 flex items-center justify-center gap-3">
                    Continue to Archive Logistics <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.form>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {(['RAZORPAY', 'COD'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPayment(p)}
                    disabled={p === 'COD' && !codAllowed}
                    className={cn(
                      'w-full text-left p-8 border transition-all duration-500 group',
                      method === p ? 'border-black bg-[#BB0006] text-white' : 'border-black/10 hover:border-black',
                      'disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-[11px] tracking-[0.04em] font-ui font-bold uppercase mb-2">
                          {p === 'RAZORPAY' ? 'Digital Asset Transfer' : 'Manual Settlement (COD)'}
                        </div>
                        <div className={cn("text-[10px] tracking-[0.1em] font-ui uppercase", method === p ? 'text-white/60' : 'text-black/60')}>
                          {p === 'RAZORPAY'
                            ? 'Secure encrypted transaction via cards/UPI.'
                            : !quote
                              ? 'Checking availability…'
                              : quote.cod.reason === 'disabled'
                                ? 'Cash on delivery is not available right now.'
                                : quote.cod.reason === 'min_order'
                                  ? `COD available on orders of ${inr(quote.cod.min_order)} or more.`
                                  : codAdvance > 0 ? `Requires ${inr(codAdvance)} advance · rest on delivery.` : 'Direct physical exchange on arrival.'}
                        </div>
                      </div>
                      <div className={cn('h-5 w-5 rounded-full border-2 transition-all', method === p ? 'border-white bg-accent' : 'border-black/20 group-hover:border-black')} />
                    </div>
                  </button>
                ))}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 pt-10 md:pt-12">
                  <button onClick={() => setStep(1)} className="order-2 md:order-1 flex-1 border border-black/20 py-5 text-[10px] tracking-[0.04em] md:tracking-[0.04em] uppercase font-ui font-bold hover:border-black transition-colors flex items-center justify-center gap-3">
                    <ArrowLeft className="w-3 h-3" /> Revisit Location
                  </button>
                  <button onClick={() => setStep(3)} className="order-1 md:order-2 flex-1 bg-[#BB0006] text-white py-5 text-[10px] tracking-[0.04em] md:tracking-[0.04em] uppercase font-ui font-bold hover:bg-accent transition-colors flex items-center justify-center gap-3">
                    Review Selection <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="border border-black/10 p-8 bg-muted/20">
                    <div className="text-[9px] tracking-[0.04em] uppercase font-ui font-bold text-black/50 mb-6">Archive Destination</div>
                    <div className="text-[11px] font-ui font-bold tracking-[0.04em] uppercase mb-2">{addr.full_name}</div>
                    <div className="text-[10px] text-black/60 leading-relaxed font-ui uppercase tracking-[0.1em]">
                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br/>
                      {addr.city}, {addr.state} {addr.pincode}<br/>
                      {addr.email} · {addr.phone}
                    </div>
                    <button onClick={() => setStep(1)} className="text-[9px] tracking-[0.04em] font-ui font-bold uppercase mt-6 text-accent border-b border-accent pb-0.5">Modify Location</button>
                  </div>
                  <div className="border border-black/10 p-8 bg-muted/20">
                    <div className="text-[9px] tracking-[0.04em] uppercase font-ui font-bold text-black/50 mb-6">Settlement Choice</div>
                    <div className="text-[11px] font-ui font-bold tracking-[0.04em] uppercase mb-4">
                      {method === 'RAZORPAY' ? 'Full Digital Payment' : `COD + ${inr(codAdvance)} Advance`}
                    </div>
                    <p className="text-[10px] text-black/60 font-ui uppercase tracking-[0.1em]">Verified via secure server processing.</p>
                    <button onClick={() => setStep(2)} className="text-[9px] tracking-[0.04em] font-ui font-bold uppercase mt-6 text-accent border-b border-accent pb-0.5">Modify Method</button>
                  </div>
                </div>
                <button
                  disabled={placing || !quote || (quote?.unavailable.length ?? 0) > 0}
                  onClick={placeOrder}
                  className="w-full bg-[#BB0006] text-white py-6 md:py-8 text-[11px] md:text-[12px] tracking-[0.04em] md:tracking-[0.04em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500 disabled:opacity-30"
                >
                  {placing ? 'Finalizing Security Check...' : `Commit Piece to Archive · ${inr(total)}`}
                </button>
                {(quote?.unavailable.length ?? 0) > 0 && (
                  <p className="text-[10px] tracking-[0.04em] uppercase font-ui font-bold text-[#BB0006]">Fix the items marked in your bag to continue.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Summary */}
        <aside className="lg:sticky lg:top-32 h-fit bg-muted/30 p-6 md:p-10 border border-black/10">
          <h2 className="text-[11px] tracking-[0.04em] font-ui font-bold uppercase mb-12 border-b border-black pb-4">Archive Contents</h2>
          <div className="space-y-8">
            {items.map((i) => {
              const pr = problem(i.variantId);
              return (
                <div key={i.variantId} className="flex gap-6">
                  <div className="w-20 aspect-[3/4] bg-muted overflow-hidden flex-shrink-0">
                    <img {...imageProps(i.image, { sizes: '80px', maxWidth: 320 })} alt="" className="w-full h-full object-cover grayscale" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="text-[11px] font-ui font-bold tracking-[0.1em] uppercase mb-1">{i.name}</div>
                    <div className="text-[9px] text-black/60 tracking-[0.04em] uppercase font-ui mb-3">
                      {[i.size, i.color].filter(Boolean).join(' // ')} · QTY {i.quantity}
                    </div>
                    <div className="text-[11px] font-ui font-bold">{inr(linePrice(i.variantId, i.price) * i.quantity)}</div>
                    {pr && (
                      <div className="mt-2 flex items-center gap-3 text-[9px] tracking-[0.04em] uppercase font-ui font-bold text-[#BB0006]">
                        <span>{problemText(pr)}</span>
                        <button onClick={() => (pr.available > 0 ? setQty(i.variantId, pr.available) : remove(i.variantId))} className="underline underline-offset-2">
                          {pr.available > 0 ? `Set to ${pr.available}` : 'Remove'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coupon */}
          <div className="mt-12 pt-8 border-t border-black/10 space-y-3">
            {couponCode ? (
              <div className="flex items-center justify-between gap-3 bg-accent/5 p-3">
                <span className={cn('text-[10px] tracking-[0.1em] font-ui font-bold uppercase', couponBroken ? 'text-black/60' : 'text-accent')}>
                  {couponBroken ? quote!.coupon!.message : `${couponCode} applied`}
                </span>
                <button onClick={() => setCoupon(null)} className="text-[9px] tracking-[0.04em] font-ui font-bold text-black/50 hover:text-black uppercase shrink-0">Remove</button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="COUPON CODE"
                  onKeyDown={(e) => { if (e.key === 'Enter') applyCoupon(codeInput); }}
                  className="flex-1 min-w-0 bg-white border border-black/10 px-4 py-3 text-[10px] tracking-[0.04em] font-ui outline-none focus:border-black transition-colors placeholder:text-black/40" />
                <button onClick={() => applyCoupon(codeInput)} disabled={applying}
                  className="px-5 bg-[#BB0006] text-white text-[10px] tracking-[0.04em] uppercase font-ui font-bold hover:bg-accent transition-colors disabled:opacity-50">
                  {applying ? '…' : 'Apply'}
                </button>
              </div>
            )}
            {coupons.length > 0 && (
              <button onClick={() => setShowCoupons(!showCoupons)} className="flex items-center gap-2 text-[10px] tracking-[0.04em] uppercase font-ui font-bold text-black/70 hover:text-black">
                <Ticket className="w-3.5 h-3.5" /> {showCoupons ? 'Hide coupons' : `View coupons (${coupons.length})`}
              </button>
            )}
            {showCoupons && (
              <div className="space-y-2">
                {coupons.map((c) => (
                  <div key={c.code} className={cn('border p-3 bg-white', c.ok ? 'border-black/20' : 'border-black/10 opacity-70')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-ui font-bold tracking-[0.06em] uppercase">{c.code}{c.personal && <span className="ml-2 text-accent">Yours</span>}</div>
                        <div className="text-[10px] font-ui text-black/60 uppercase tracking-[0.04em] mt-1">
                          {couponOfferText(c, inr)}{c.min_order > 0 ? ` · min ${inr(c.min_order)}` : ''}
                        </div>
                        <div className={cn('text-[10px] font-ui uppercase tracking-[0.04em] mt-1', c.ok ? 'text-accent font-bold' : 'text-black/50')}>
                          {c.ok ? `You save ${inr(c.discount)}` : c.message}
                        </div>
                      </div>
                      <button disabled={!c.ok || applying || couponCode === c.code} onClick={() => applyCoupon(c.code)}
                        className="shrink-0 px-3 py-2 border border-black text-[9px] tracking-[0.04em] uppercase font-ui font-bold disabled:opacity-30">
                        {couponCode === c.code ? 'Applied' : 'Apply'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-black/10 space-y-4">
            <div className="flex justify-between text-[10px] tracking-[0.04em] uppercase font-ui font-bold text-black/60">
              <span>Archive Value</span>
              <span className="text-black">{inr(sub)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[10px] tracking-[0.04em] uppercase font-ui font-bold text-accent">
                <span>Coupon {couponCode}</span>
                <span>−{inr(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px] tracking-[0.04em] uppercase font-ui font-bold text-black/60">
              <span>Archive Logistics</span>
              <span className="text-black">{shipping === 0 ? 'COMPLIMENTARY' : inr(shipping)}</span>
            </div>
            {quote && shipping > 0 && quote.free_shipping_threshold > 0 && (
              <p className="text-[9px] tracking-[0.04em] uppercase font-ui text-black/50">Add {inr(quote.free_shipping_threshold - (sub - discount))} more for free shipping</p>
            )}
            <div className="flex justify-between items-end pt-8 border-t border-black">
              <span className="text-[12px] tracking-[0.04em] uppercase font-ui font-bold">Total Reserve</span>
              <span className="text-2xl font-ui font-bold tracking-tighter">{inr(total)}</span>
            </div>
            {method === 'COD' && codAdvance > 0 && (
              <p className="text-[10px] tracking-[0.04em] uppercase font-ui text-black/60">Pay {inr(codAdvance)} now · {inr(Math.round((total - codAdvance) * 100) / 100)} on delivery</p>
            )}
          </div>

          <div className="mt-12 flex flex-col gap-4 text-[9px] tracking-[0.04em] text-black/40 uppercase font-ui text-center">
             <div className="flex items-center justify-center gap-2"><ShieldCheck className="w-3 h-3" /> Secure Archive Protocol</div>
             <div className="flex items-center justify-center gap-2">Dispatched via Global Logistics within 24H</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
