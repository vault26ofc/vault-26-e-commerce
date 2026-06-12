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
import { ChevronRight, ArrowLeft, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import { triggerOrderNotification } from '@/lib/whatsapp';

const addressSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(15),
  email: z.string().trim().email().max(120),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().min(4).max(10),
});

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, couponCode, clear, subtotal } = useCart();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [addr, setAddr] = useState({ full_name: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pincode: '' });
  const [payment, setPayment] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [discount, setDiscount] = useState(0);
  const [shippingThreshold, setShippingThreshold] = useState(999);
  const [shippingFee, setShippingFee] = useState(79);
  const [codThreshold, setCodThreshold] = useState(2000);
  const [codAdvancePct, setCodAdvancePct] = useState(20);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    supabase.from('settings').select('key,value').then(({ data }) => {
      data?.forEach((s: any) => {
        if (s.key === 'free_shipping_threshold') setShippingThreshold(Number(s.value));
        if (s.key === 'shipping_fee') setShippingFee(Number(s.value));
        if (s.key === 'cod_threshold') setCodThreshold(Number(s.value));
        if (s.key === 'cod_advance_percent') setCodAdvancePct(Number(s.value));
      });
    });
  }, []);

  useEffect(() => {
    if (user?.email) setAddr((a) => ({ ...a, email: user.email || '' }));
  }, [user]);

  // Stable key: only changes when actual cart contents change, not on every Zustand re-render
  const itemsKey = items.map((i) => `${i.variantId}:${i.quantity}`).join(',');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!couponCode) { setDiscount(0); return; }
      const { data } = await supabase.from('coupons').select('*').eq('code', couponCode).maybeSingle();
      if (cancelled || !data) return;
      const sub = subtotal();
      if (sub < Number(data.min_order)) { setDiscount(0); return; }
      const d = data.type === 'PERCENT' ? Math.round(sub * Number(data.value) / 100) : Number(data.value);
      if (!cancelled) setDiscount(Math.min(d, sub));
    })();
    return () => { cancelled = true; };
  }, [couponCode, itemsKey]);

  if (items.length === 0) {
    return (
      <div className="container-px py-48 text-center bg-white min-h-screen flex flex-col items-center justify-center">
        <span className="eyebrow block mb-8">Empty Collection</span>
        <h1 className="display-2 mb-12 italic font-elegant">Your bag awaits its first piece.</h1>
        <Link to="/category/shirts" className="border border-black px-12 py-5 text-[11px] tracking-[0.4em] uppercase font-ui font-bold hover:bg-black hover:text-white transition-all duration-500">
          Discover Archives
        </Link>
      </div>
    );
  }

  const sub = subtotal();
  const shipping = sub >= shippingThreshold ? 0 : shippingFee;
  const total = Math.max(0, sub - discount) + shipping;
  const codAdvance = total > codThreshold ? Math.round(total * codAdvancePct / 100) : 0;

  const loadRazorpay = () => new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const payWithRazorpay = (order: any, amount: number) => new Promise<void>(async (resolve, reject) => {
    const ok = await loadRazorpay();
    if (!ok) return reject(new Error('Razorpay failed to load'));
    const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
      body: { amount, receipt: order.order_number },
    });
    if (error || !data?.order) return reject(new Error(data?.error || 'Could not create payment'));
    const rzp = new (window as any).Razorpay({
      key: data.key_id,
      amount: data.order.amount,
      currency: data.order.currency,
      order_id: data.order.id,
      name: 'Vault 26',
      description: `Order ${order.order_number}`,
      prefill: { name: addr.full_name, email: addr.email, contact: addr.phone },
      theme: { color: '#B11226' },
      handler: async (resp: any) => {
        const { data: v, error: ve } = await supabase.functions.invoke('razorpay-verify-payment', {
          body: { ...resp, order_id: order.id },
        });
        if (ve || !v?.success) return reject(new Error('Payment verification failed'));
        resolve();
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.open();
  });

  const placeOrder = async () => {
    setPlacing(true);
    try {
      // Server-side order creation: prices are re-validated from DB, not trusted from client
      const { data: orderData, error } = await supabase.rpc('create_order', {
        p_user_id: user?.id ?? null,
        p_email: addr.email,
        p_shipping_address: addr,
        p_items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
        p_coupon_code: couponCode ?? null,
        p_payment_method: payment,
      });

      if (error) throw error;
      const order = orderData as { id: string; order_number: string; total: number; cod_advance_amount: number; payment_method: string };

      if (payment === 'RAZORPAY') {
        await payWithRazorpay(order, order.total);
      } else if (payment === 'COD' && order.cod_advance_amount > 0) {
        await payWithRazorpay(order, order.cod_advance_amount);
      }

      if (addr.phone) {
        triggerOrderNotification('order_placed', { ...order, email: addr.email, shipping_address: addr, user_id: user?.id }, addr.phone).catch(() => {});
      }
      toast.success('Order secured in the archive');
      clear();
      navigate(`/order-success/${order.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Could not finalize archive order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="container-px py-12 md:py-24 min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[1fr_480px] gap-12 lg:gap-32">
        <div className="flex flex-col">
          <header className="mb-10 md:mb-16">
            <span className="eyebrow block mb-3 md:mb-4">Secure Checkout</span>
            <h1 className="display-2 italic font-elegant text-3xl md:text-5xl">Finalize <span className="text-accent">Piece</span></h1>
          </header>

          {/* Editorial Stepper */}
          <div className="flex items-center gap-6 md:gap-12 mb-10 md:mb-16 border-b border-black/5 pb-6 md:pb-8 overflow-x-auto scrollbar-hide">
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
                  step === s.id && 'bg-black text-white'
                )}>
                  {s.id}
                </span>
                <span className="text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.4em] uppercase font-ui font-bold">{s.label}</span>
                {s.id < 3 && <div className="w-8 md:w-12 h-[1px] bg-black/10 shrink-0" />}
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
                    <label className="text-[9px] tracking-[0.4em] uppercase font-ui font-bold text-black/30 mb-2 block">{field.l}</label>
                    <input 
                      value={(addr as any)[field.k]} 
                      onChange={(e) => setAddr({ ...addr, [field.k]: e.target.value })}
                      className="w-full border-b border-black/10 bg-transparent py-4 text-sm font-ui outline-none focus:border-black transition-colors"
                      placeholder={`Enter ${field.l.toLowerCase()}`}
                    />
                  </div>
                ))}
                <div className="md:col-span-2 pt-6 md:pt-8">
                  <button type="submit" className="w-full bg-black text-white py-5 md:py-6 text-[10px] md:text-[11px] tracking-[0.3em] md:tracking-[0.5em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500 flex items-center justify-center gap-3">
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
                    className={cn(
                      'w-full text-left p-8 border transition-all duration-500 group',
                      payment === p ? 'border-black bg-black text-white' : 'border-black/5 hover:border-black'
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-[11px] tracking-[0.3em] font-ui font-bold uppercase mb-2">
                          {p === 'RAZORPAY' ? 'Digital Asset Transfer' : 'Manual Settlement (COD)'}
                        </div>
                        <div className={cn("text-[10px] tracking-[0.1em] font-ui uppercase", payment === p ? 'text-white/60' : 'text-black/40')}>
                          {p === 'RAZORPAY' ? 'Secure encrypted transaction via cards/UPI.' : codAdvance > 0 ? `Requires ${inr(codAdvance)} security deposit.` : 'Direct physical exchange on arrival.'}
                        </div>
                      </div>
                      <div className={cn('h-5 w-5 rounded-full border-2 transition-all', payment === p ? 'border-white bg-accent' : 'border-black/10 group-hover:border-black')} />
                    </div>
                  </button>
                ))}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 pt-10 md:pt-12">
                  <button onClick={() => setStep(1)} className="order-2 md:order-1 flex-1 border border-black/10 py-5 text-[10px] tracking-[0.3em] md:tracking-[0.4em] uppercase font-ui font-bold hover:border-black transition-colors flex items-center justify-center gap-3">
                    <ArrowLeft className="w-3 h-3" /> Revisit Location
                  </button>
                  <button onClick={() => setStep(3)} className="order-1 md:order-2 flex-1 bg-black text-white py-5 text-[10px] tracking-[0.3em] md:tracking-[0.4em] uppercase font-ui font-bold hover:bg-accent transition-colors flex items-center justify-center gap-3">
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
                  <div className="border border-black/5 p-8 bg-muted/20">
                    <div className="text-[9px] tracking-[0.4em] uppercase font-ui font-bold text-black/30 mb-6">Archive Destination</div>
                    <div className="text-[11px] font-ui font-bold tracking-[0.2em] uppercase mb-2">{addr.full_name}</div>
                    <div className="text-[10px] text-black/60 leading-relaxed font-ui uppercase tracking-[0.1em]">
                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br/>
                      {addr.city}, {addr.state} {addr.pincode}<br/>
                      {addr.email} · {addr.phone}
                    </div>
                    <button onClick={() => setStep(1)} className="text-[9px] tracking-[0.3em] font-ui font-bold uppercase mt-6 text-accent border-b border-accent pb-0.5">Modify Location</button>
                  </div>
                  <div className="border border-black/5 p-8 bg-muted/20">
                    <div className="text-[9px] tracking-[0.4em] uppercase font-ui font-bold text-black/30 mb-6">Settlement Choice</div>
                    <div className="text-[11px] font-ui font-bold tracking-[0.2em] uppercase mb-4">
                      {payment === 'RAZORPAY' ? 'Full Digital Payment' : `COD + ${inr(codAdvance)} Advance`}
                    </div>
                    <p className="text-[10px] text-black/60 font-ui uppercase tracking-[0.1em]">Verified via secure server processing.</p>
                    <button onClick={() => setStep(2)} className="text-[9px] tracking-[0.3em] font-ui font-bold uppercase mt-6 text-accent border-b border-accent pb-0.5">Modify Method</button>
                  </div>
                </div>
                <button 
                  disabled={placing} 
                  onClick={placeOrder} 
                  className="w-full bg-black text-white py-6 md:py-8 text-[11px] md:text-[12px] tracking-[0.3em] md:tracking-[0.6em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500 disabled:opacity-30"
                >
                  {placing ? 'Finalizing Security Check...' : `Commit Piece to Archive · ${inr(total)}`}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Summary */}
        <aside className="lg:sticky lg:top-32 h-fit bg-muted/30 p-6 md:p-10 border border-black/5">
          <h2 className="text-[11px] tracking-[0.5em] font-ui font-bold uppercase mb-12 border-b border-black pb-4">Archive Contents</h2>
          <div className="space-y-8">
            {items.map((i) => (
              <div key={i.variantId} className="flex gap-6">
                <div className="w-20 aspect-[3/4] bg-muted overflow-hidden flex-shrink-0">
                  <img src={i.image} alt="" className="w-full h-full object-cover grayscale" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-[11px] font-ui font-bold tracking-[0.1em] uppercase mb-1">{i.name}</div>
                  <div className="text-[9px] text-black/40 tracking-[0.2em] uppercase font-ui mb-3">
                    {[i.size, i.color].filter(Boolean).join(' // ')} · QTY {i.quantity}
                  </div>
                  <div className="text-[11px] font-ui font-bold">{inr(i.price * i.quantity)}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-16 pt-8 border-t border-black/5 space-y-4">
            <div className="flex justify-between text-[10px] tracking-[0.2em] uppercase font-ui font-bold text-black/40">
              <span>Archive Value</span>
              <span className="text-black">{inr(sub)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[10px] tracking-[0.2em] uppercase font-ui font-bold text-accent">
                <span>Voucher Applied</span>
                <span>−{inr(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px] tracking-[0.2em] uppercase font-ui font-bold text-black/40">
              <span>Archive Logistics</span>
              <span className="text-black">{shipping === 0 ? 'COMPLIMENTARY' : inr(shipping)}</span>
            </div>
            <div className="flex justify-between items-end pt-8 border-t border-black border-double border-b-0 border-l-0 border-r-0">
              <span className="text-[12px] tracking-[0.4em] uppercase font-ui font-bold">Total Reserve</span>
              <span className="text-2xl font-ui font-bold tracking-tighter">{inr(total)}</span>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 text-[9px] tracking-[0.2em] text-black/20 uppercase font-ui text-center">
             <div className="flex items-center justify-center gap-2"><ShieldCheck className="w-3 h-3" /> Secure Archive Protocol</div>
             <div className="flex items-center justify-center gap-2">Dispatched via Global Logistics within 24H</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

