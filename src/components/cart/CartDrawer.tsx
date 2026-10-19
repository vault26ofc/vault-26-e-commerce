import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/store';
import { inr } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchQuote, problemText, useQuote } from '@/lib/quote';
import { imageProps } from '@/lib/image';

export default function CartDrawer() {
  const { items, drawerOpen, setDrawer, setQty, remove, couponCode, setCoupon, subtotal } = useCart();
  const [code, setCode] = useState(couponCode || '');
  const [applying, setApplying] = useState(false);
  // Prices, coupon and shipping come from the server quote; local prices only fill the gap while it loads.
  const { quote } = useQuote(drawerOpen ? items : [], couponCode);
  const sub = quote?.subtotal ?? subtotal();
  const discount = quote?.discount ?? 0;
  const shipping = quote?.shipping ?? 0;
  const total = quote?.total ?? sub;
  const linePrice = (variantId: string, fallback: number) => quote?.lines.find((l) => l.variant_id === variantId)?.price ?? fallback;
  const problem = (variantId: string) => quote?.unavailable.find((u) => u.variant_id === variantId);

  const apply = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setApplying(true);
    try {
      const q = await fetchQuote(items, c);
      if (!q.coupon?.ok) { toast.error(q.coupon?.message || 'This coupon can\'t be used'); return; }
      setCoupon(c);
      toast.success(`Coupon applied: −${inr(q.discount)}`);
    } catch {
      toast.error('Could not check that coupon. Try again.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawer(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-white z-[101] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-black/10">
              <div className="flex items-center gap-4">
                <span className="text-[12px] tracking-[0.04em] font-ui font-bold uppercase">Archive Selection</span>
                <span className="h-5 w-5 rounded-full bg-[#BB0006] text-white text-[9px] flex items-center justify-center font-bold">{items.length}</span>
              </div>
              <button
                onClick={() => setDrawer(false)}
                className="hover:rotate-90 transition-transform duration-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 border border-black/10 rounded-full flex items-center justify-center mb-8">
                  <ShoppingBag className="w-6 h-6 text-black/40" strokeWidth={1} />
                </div>
                <h3 className="uppercase text-xl font-elegant mb-4">Your archive is empty</h3>
                <p className="text-[10px] tracking-[0.04em] text-black/60 uppercase font-ui mb-10">Select pieces to add to your collection</p>
                <Link
                  to="/category/shirts"
                  onClick={() => setDrawer(false)}
                  className="border border-black px-12 py-5 text-[11px] tracking-[0.04em] uppercase font-ui font-bold hover:bg-[#AA0001] hover:text-white transition-all duration-500"
                >
                  Explore Drops
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                  {items.map((it) => (
                    <div key={it.variantId} className="group flex gap-6">
                      <Link
                        to={`/products/${it.slug}`}
                        onClick={() => setDrawer(false)}
                        className="w-24 aspect-[3/4] bg-muted overflow-hidden flex-shrink-0"
                      >
                        <img
                          {...imageProps(it.image, { sizes: '96px', maxWidth: 480 })}
                          alt={it.name}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                        />
                      </Link>
                      <div className="flex-1 flex flex-col py-1">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <div>
                            {it.brand && <div className="text-[9px] tracking-[0.04em] font-ui font-bold text-accent mb-1 uppercase">{it.brand}</div>}
                            <Link
                              to={`/products/${it.slug}`}
                              onClick={() => setDrawer(false)}
                              className="text-[12px] font-ui font-bold tracking-[0.1em] uppercase leading-tight hover:text-accent transition-colors"
                            >
                              {it.name}
                            </Link>
                            <div className="text-[10px] text-black/60 mt-1 uppercase tracking-[0.1em] font-ui">
                              {[it.size, it.color].filter(Boolean).join(' // ')}
                            </div>
                          </div>
                          <button
                            onClick={() => remove(it.variantId)}
                            className="text-black/40 hover:text-accent transition-colors p-1"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1} />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center border border-black/10 bg-muted/30">
                            <button
                              onClick={() => setQty(it.variantId, it.quantity - 1)}
                              className="p-2 hover:bg-black/15 transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-[11px] font-bold font-ui">{it.quantity}</span>
                            <button
                              onClick={() => setQty(it.variantId, it.quantity + 1)}
                              className="p-2 hover:bg-black/15 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="text-[12px] font-ui font-bold">{inr(linePrice(it.variantId, it.price) * it.quantity)}</div>
                        </div>
                        {problem(it.variantId) && (
                          <div className="mt-2 flex items-center justify-between gap-3 text-[10px] tracking-[0.04em] uppercase font-ui font-bold text-[#BB0006]">
                            <span>{problemText(problem(it.variantId)!)}</span>
                            <button
                              onClick={() => { const p = problem(it.variantId)!; if (p.available > 0) setQty(it.variantId, p.available); else remove(it.variantId); }}
                              className="underline underline-offset-2 shrink-0"
                            >
                              {problem(it.variantId)!.available > 0 ? `Set to ${problem(it.variantId)!.available}` : 'Remove'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-8 bg-muted/30 border-t border-black/10 space-y-6">
                  <div className="flex gap-4">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="ARCHIVE_VOUCHER"
                      className="flex-1 bg-white border border-black/10 px-4 py-3 text-[10px] tracking-[0.04em] font-ui outline-none focus:border-black transition-colors placeholder:text-black/40"
                    />
                    <button
                      onClick={apply}
                      disabled={applying}
                      className="px-6 bg-[#BB0006] text-white text-[10px] tracking-[0.04em] uppercase font-ui font-bold hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {applying ? '…' : 'Apply'}
                    </button>
                  </div>

                  {couponCode && (
                    <div className="flex items-center justify-between gap-3 bg-accent/5 p-3">
                      <span className={cn('text-[10px] tracking-[0.1em] font-ui font-bold uppercase', quote?.coupon && !quote.coupon.ok ? 'text-black/60' : 'text-accent')}>
                        {quote?.coupon && !quote.coupon.ok ? quote.coupon.message : `${couponCode} applied`}
                      </span>
                      <button
                        onClick={() => { setCoupon(null); setCode(''); }}
                        className="text-[9px] tracking-[0.04em] font-ui font-bold text-black/50 hover:text-black uppercase"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-[10px] tracking-[0.04em] uppercase font-ui font-bold text-black/60">
                      <span>Selection Subtotal</span>
                      <span className="text-black">{inr(sub)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-[10px] tracking-[0.04em] uppercase font-ui font-bold text-accent">
                        <span>Voucher Credit</span>
                        <span>−{inr(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] tracking-[0.04em] uppercase font-ui font-bold text-black/60">
                      <span>Logistics Estimate</span>
                      <span className="text-black">{shipping === 0 ? 'COMPLIMENTARY' : inr(shipping)}</span>
                    </div>
                    {quote && shipping > 0 && quote.free_shipping_threshold > 0 && (
                      <p className="text-[9px] tracking-[0.04em] uppercase font-ui text-black/50">
                        Add {inr(quote.free_shipping_threshold - (sub - discount))} more for free shipping
                      </p>
                    )}
                    <div className="flex justify-between items-end pt-6 mt-4 border-t border-black">
                      <span className="text-[12px] tracking-[0.04em] uppercase font-ui font-bold">Total Archive Value</span>
                      <span className="text-2xl font-ui font-bold tracking-tighter">{inr(total)}</span>
                    </div>
                  </div>

                  <Link
                    to="/checkout"
                    onClick={() => setDrawer(false)}
                    className="flex items-center justify-center gap-4 w-full bg-[#BB0006] text-white py-6 text-[11px] tracking-[0.04em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500 shadow-xl"
                  >
                    Secure Order <ArrowRight className="w-4 h-4" />
                  </Link>

                  <p className="text-[9px] text-center tracking-[0.04em] text-black/40 uppercase font-ui pb-2">
                    Tax included // Shipping calculated at next step
                  </p>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

