import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/store';
import { inr } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CartDrawer() {
  const { items, drawerOpen, setDrawer, setQty, remove, couponCode, setCoupon, subtotal } = useCart();
  const [code, setCode] = useState(couponCode || '');
  const [discount, setDiscount] = useState(0);
  const [shippingThreshold, setShippingThreshold] = useState(999);
  const [shippingFee, setShippingFee] = useState(79);

  useEffect(() => {
    supabase.from('settings').select('key,value').in('key', ['free_shipping_threshold', 'shipping_fee']).then(({ data }) => {
      data?.forEach((s: any) => {
        if (s.key === 'free_shipping_threshold') setShippingThreshold(Number(s.value));
        if (s.key === 'shipping_fee') setShippingFee(Number(s.value));
      });
    });
  }, []);

  const sub = subtotal();
  const shipping = sub === 0 ? 0 : sub >= shippingThreshold ? 0 : shippingFee;
  const total = Math.max(0, sub - discount) + shipping;

  useEffect(() => {
    // recompute discount when coupon or subtotal changes
    if (!couponCode) { setDiscount(0); return; }
    supabase.from('coupons').select('*').eq('code', couponCode).eq('is_active', true).maybeSingle().then(({ data }) => {
      if (!data) { setDiscount(0); return; }
      if (sub < Number(data.min_order)) { setDiscount(0); return; }
      const d = data.type === 'PERCENT' ? Math.round(sub * Number(data.value) / 100) : Number(data.value);
      setDiscount(Math.min(d, sub));
    });
  }, [couponCode, sub]);

  const apply = async () => {
    if (!code.trim()) return;
    const { data } = await supabase.from('coupons').select('*').eq('code', code.trim().toUpperCase()).eq('is_active', true).maybeSingle();
    if (!data) { toast.error('Invalid coupon'); return; }
    if (sub < Number(data.min_order)) { toast.error(`Minimum order ${inr(Number(data.min_order))}`); return; }
    setCoupon(data.code);
    toast.success(`Coupon applied — saved ${data.type === 'PERCENT' ? data.value + '%' : inr(Number(data.value))}`);
  };

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDrawer(false)} className="fixed inset-0 bg-black/50 z-50" />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-background z-50 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="font-display text-lg">Your Bag <span className="text-muted-foreground text-sm">({items.length})</span></div>
              <button onClick={() => setDrawer(false)}><X className="h-5 w-5" /></button>
            </div>
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-3">
                <p className="text-muted-foreground">Your bag is empty.</p>
                <Link to="/category/shirts" onClick={() => setDrawer(false)} className="text-sm uppercase tracking-widest border-b border-foreground pb-1">Continue Shopping</Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {items.map((it) => (
                    <div key={it.variantId} className="flex gap-4">
                      <Link to={`/products/${it.slug}`} onClick={() => setDrawer(false)} className="w-20 h-24 bg-muted shrink-0 overflow-hidden">
                        <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                      </Link>
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between gap-2">
                          <div>
                            {it.brand && <div className="eyebrow">{it.brand}</div>}
                            <Link to={`/products/${it.slug}`} onClick={() => setDrawer(false)} className="text-sm font-medium leading-tight">{it.name}</Link>
                            <div className="text-xs text-muted-foreground mt-0.5">{[it.size, it.color].filter(Boolean).join(' · ')}</div>
                          </div>
                          <button onClick={() => remove(it.variantId)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="inline-flex items-center border border-border">
                            <button onClick={() => setQty(it.variantId, it.quantity - 1)} className="p-1.5"><Minus className="h-3 w-3" /></button>
                            <span className="px-3 text-sm">{it.quantity}</span>
                            <button onClick={() => setQty(it.variantId, it.quantity + 1)} className="p-1.5"><Plus className="h-3 w-3" /></button>
                          </div>
                          <div className="text-sm font-medium">{inr(it.price * it.quantity)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-5 space-y-3">
                  <div className="flex gap-2">
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code"
                      className="flex-1 border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground" />
                    <button onClick={apply} className="px-4 text-xs uppercase tracking-widest bg-foreground text-background btn-press">Apply</button>
                  </div>
                  {couponCode && (
                    <div className="text-xs flex justify-between items-center">
                      <span className="text-accent">{couponCode} applied</span>
                      <button onClick={() => { setCoupon(null); setCode(''); }} className="text-muted-foreground underline">Remove</button>
                    </div>
                  )}
                  <div className="space-y-1.5 text-sm border-t border-border pt-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{inr(sub)}</span></div>
                    {discount > 0 && <div className="flex justify-between text-accent"><span>Discount</span><span>−{inr(discount)}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : inr(shipping)}</span></div>
                    <div className="flex justify-between font-medium text-base pt-2 border-t border-border">
                      <span>Total</span><span>{inr(total)}</span>
                    </div>
                  </div>
                  <Link to="/checkout" onClick={() => setDrawer(false)}
                    className="block w-full text-center bg-foreground text-background py-3.5 text-sm uppercase tracking-widest btn-press hover:bg-accent hover:text-accent-foreground transition-colors">
                    Proceed to Checkout
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
