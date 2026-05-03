import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/store';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { toast } from 'sonner';
import { z } from 'zod';

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

  useEffect(() => {
    (async () => {
      if (!couponCode) { setDiscount(0); return; }
      const { data } = await supabase.from('coupons').select('*').eq('code', couponCode).maybeSingle();
      if (!data) return;
      const sub = subtotal();
      if (sub < Number(data.min_order)) { setDiscount(0); return; }
      const d = data.type === 'PERCENT' ? Math.round(sub * Number(data.value) / 100) : Number(data.value);
      setDiscount(Math.min(d, sub));
    })();
  }, [couponCode, items]);

  if (items.length === 0) {
    return (
      <div className="container-px py-20 text-center">
        <h1 className="display-2">Your bag is empty</h1>
        <Link to="/category/shirts" className="mt-6 inline-block text-xs uppercase tracking-widest border-b border-foreground pb-1">Continue shopping</Link>
      </div>
    );
  }

  const sub = subtotal();
  const shipping = sub >= shippingThreshold ? 0 : shippingFee;
  const total = Math.max(0, sub - discount) + shipping;
  const codAdvance = total > codThreshold ? Math.round(total * codAdvancePct / 100) : 0;

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const orderItems = items.map((i) => ({
        variant_id: i.variantId,
        product_name: i.name,
        variant_label: [i.size, i.color].filter(Boolean).join(' · '),
        image: i.image,
        quantity: i.quantity,
        price_at_purchase: i.price,
      }));

      const { data: order, error } = await supabase.from('orders').insert({
        user_id: user?.id ?? null,
        email: addr.email,
        shipping_address: addr,
        subtotal: sub,
        discount,
        shipping,
        total,
        payment_method: payment,
        payment_status: payment === 'COD' && codAdvance === 0 ? 'PENDING' : 'PENDING',
        cod_advance_amount: payment === 'COD' ? codAdvance : 0,
        coupon_code: couponCode,
      }).select().single();

      if (error) throw error;

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems.map((it) => ({ ...it, order_id: order.id })));
      if (itemsErr) throw itemsErr;

      // For RAZORPAY/COD-with-advance we'd integrate Razorpay here. For now mark as placed and clear.
      toast.success('Order placed');
      clear();
      navigate(`/order-success/${order.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Could not place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="container-px py-10 max-w-6xl">
      <h1 className="display-2 mb-8">Checkout</h1>
      <div className="grid lg:grid-cols-[1fr_400px] gap-10">
        <div>
          {/* Stepper */}
          <div className="flex items-center gap-3 mb-8 text-xs uppercase tracking-widest">
            {[[1,'Address'],[2,'Payment'],[3,'Review']].map(([n, l]) => (
              <div key={n} className={`flex items-center gap-2 ${step === n ? 'text-foreground' : 'text-muted-foreground'}`}>
                <span className={`h-6 w-6 rounded-full border flex items-center justify-center ${step === n ? 'bg-foreground text-background border-foreground' : 'border-border'}`}>{n}</span>
                {l}
              </div>
            ))}
          </div>

          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault();
              const r = addressSchema.safeParse(addr);
              if (!r.success) { toast.error(r.error.issues[0].message); return; }
              setStep(2);
            }} className="grid grid-cols-2 gap-4">
              {[['full_name','Full name', 'col-span-2'],['email','Email','col-span-2'],['phone','Phone','col-span-1'],['pincode','Pincode','col-span-1'],['line1','Address line 1','col-span-2'],['line2','Address line 2 (optional)','col-span-2'],['city','City','col-span-1'],['state','State','col-span-1']].map(([k, l, c]) => (
                <label key={k} className={`${c} text-xs uppercase tracking-widest text-muted-foreground`}>
                  {l}
                  <input value={(addr as any)[k]} onChange={(e) => setAddr({ ...addr, [k]: e.target.value })}
                    className="mt-1.5 w-full border border-border bg-transparent px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground" />
                </label>
              ))}
              <button type="submit" className="col-span-2 mt-3 bg-foreground text-background py-3.5 text-xs uppercase tracking-widest btn-press">Continue to payment</button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {(['RAZORPAY','COD'] as const).map((p) => (
                <button key={p} onClick={() => setPayment(p)} className={`w-full text-left p-5 border ${payment === p ? 'border-foreground' : 'border-border'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{p === 'RAZORPAY' ? 'UPI / Cards / Wallets (Razorpay)' : 'Cash on Delivery'}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {p === 'RAZORPAY' ? 'Pay securely online via Razorpay.' : codAdvance > 0 ? `Pay ${inr(codAdvance)} advance now to confirm.` : 'Pay in cash on delivery.'}
                      </div>
                    </div>
                    <div className={`h-4 w-4 rounded-full border-2 ${payment === p ? 'border-foreground bg-foreground' : 'border-border'}`} />
                  </div>
                </button>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 border border-border py-3 text-xs uppercase tracking-widest">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-foreground text-background py-3 text-xs uppercase tracking-widest btn-press">Review order</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="border border-border p-5">
                <div className="eyebrow mb-2">Shipping to</div>
                <div className="text-sm">{addr.full_name}, {addr.line1}{addr.line2 ? ', ' + addr.line2 : ''}, {addr.city}, {addr.state} {addr.pincode}</div>
                <div className="text-xs text-muted-foreground mt-1">{addr.email} · {addr.phone}</div>
                <button onClick={() => setStep(1)} className="text-xs eyebrow mt-2 link-underline">Edit</button>
              </div>
              <div className="border border-border p-5">
                <div className="eyebrow mb-2">Payment</div>
                <div className="text-sm">{payment === 'RAZORPAY' ? 'UPI / Cards / Wallets' : `Cash on Delivery${codAdvance ? ` (Advance ${inr(codAdvance)})` : ''}`}</div>
                <button onClick={() => setStep(2)} className="text-xs eyebrow mt-2 link-underline">Edit</button>
              </div>
              <button disabled={placing} onClick={placeOrder} className="w-full bg-foreground text-background py-4 text-xs uppercase tracking-widest btn-press disabled:opacity-50">
                {placing ? 'Placing…' : `Place Order · ${inr(total)}`}
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        <aside className="bg-secondary p-6 h-fit">
          <div className="font-display text-lg mb-4">Order summary</div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
            {items.map((i) => (
              <div key={i.variantId} className="flex gap-3">
                <img src={i.image} alt="" className="w-14 h-16 object-cover" />
                <div className="flex-1 text-sm">
                  <div className="leading-tight">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{[i.size, i.color].filter(Boolean).join(' · ')} · Qty {i.quantity}</div>
                </div>
                <div className="text-sm">{inr(i.price * i.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border my-4" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{inr(sub)}</span></div>
            {discount > 0 && <div className="flex justify-between text-accent"><span>Coupon ({couponCode})</span><span>−{inr(discount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : inr(shipping)}</span></div>
            <div className="flex justify-between font-medium text-base pt-2 border-t border-border">
              <span>Total</span><span>{inr(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
