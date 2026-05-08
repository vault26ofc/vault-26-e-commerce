import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Package, ArrowRight, Truck, CheckCircle2, Clock } from 'lucide-react';

const STATUS_LABELS = ['PENDING', 'PACKED', 'SHIPPED', 'DELIVERED'];

export function OrdersList() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('orders').select('*, order_items(image, product_name, quantity)').eq('user_id', user.id).order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || loading) return <div className="container-px py-48 text-center uppercase tracking-[0.5em] text-[10px] animate-pulse">Retrieving Order Archive...</div>;
  if (!user) return (
    <div className="container-px py-48 text-center">
      <h1 className="display-2 italic font-elegant mb-8">Access Denied</h1>
      <Link to="/login" className="border border-black px-12 py-5 text-[11px] tracking-[0.4em] uppercase font-ui font-bold">Authorize Sign In</Link>
    </div>
  );

  return (
    <div className="container-px py-24 min-h-screen bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl mx-auto"
      >
        <span className="eyebrow block mb-4">Transaction History</span>
        <h1 className="display-2 mb-16">The <span className="italic">Orders</span></h1>

        {orders.length === 0 ? (
          <div className="text-center py-32 border border-black/10 bg-muted/20">
            <Package className="h-10 w-10 text-black/30 mx-auto mb-6" strokeWidth={1} />
            <p className="text-[10px] tracking-[0.3em] text-black/60 uppercase font-ui">Your archive contains no transactions.</p>
            <Link to="/category/shirts" className="mt-10 inline-block text-[10px] tracking-[0.4em] font-bold border-b border-black pb-1 hover:text-accent hover:border-accent transition-colors uppercase font-ui">Discover Drops</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link to={`/orders/${o.id}`} className="group block border border-black/10 p-8 hover:border-black transition-all duration-500 bg-muted/20">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1">
                      <div className="text-[12px] font-ui font-bold tracking-[0.2em] uppercase mb-2 group-hover:text-accent transition-colors">#{o.order_number}</div>
                      <div className="text-[10px] text-black/60 tracking-[0.1em] font-ui uppercase">
                        LOGGED {new Date(o.created_at).toLocaleDateString()} // {o.order_items.length} PIECES
                      </div>
                    </div>
                    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <div className="text-[12px] font-ui font-bold tracking-[0.1em]">{inr(Number(o.total))}</div>
                        <span className="inline-block mt-2 text-[9px] uppercase tracking-[0.3em] text-black/60 font-ui font-bold">{o.status}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-black/40 group-hover:text-black transition-all group-hover:translate-x-2" />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8 opacity-60 group-hover:opacity-100 transition-opacity">
                    {o.order_items.slice(0, 5).map((it: any, j: number) => (
                      <div key={j} className="w-12 aspect-[3/4] bg-muted overflow-hidden">
                        <img src={it.image} className="w-full h-full object-cover grayscale" />
                      </div>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
      setO(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="container-px py-48 text-center uppercase tracking-[0.5em] text-[10px] animate-pulse">Decrypting Order Data...</div>;
  if (!o) return <div className="container-px py-48 text-center uppercase tracking-[0.5em] text-[10px]">Log Not Found</div>;

  const stage = STATUS_LABELS.indexOf(o.status);

  return (
    <div className="container-px py-24 min-h-screen bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <header className="mb-16 border-b border-black/10 pb-12">
          <span className="eyebrow block mb-4">Transaction Details // #{o.order_number}</span>
          <h1 className="display-2 font-elegant italic">Archive <span className="text-accent">Record</span></h1>
          <p className="text-[10px] tracking-[0.4em] text-black/60 font-ui mt-6 uppercase">PLOTTED ON {new Date(o.created_at).toLocaleDateString()} AT {new Date(o.created_at).toLocaleTimeString()}</p>
        </header>

        {/* Timeline */}
        {o.status !== 'CANCELLED' && (
          <div className="mb-20">
            <div className="grid grid-cols-4 gap-4 mb-4">
              {STATUS_LABELS.map((s, i) => (
                <div key={s} className="flex flex-col gap-3">
                   <div className={cn('h-1 transition-all duration-1000', i <= stage ? 'bg-accent' : 'bg-black/15')} />
                   <span className={cn('text-[9px] tracking-[0.3em] font-ui font-bold uppercase', i <= stage ? 'text-black' : 'text-black/40')}>
                    {s}
                   </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] font-ui text-black/60 uppercase">
              {o.status === 'DELIVERED' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4" />}
              Status: {o.status} // System Verified
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_350px] gap-16">
          <section className="space-y-8">
            <div className="text-[10px] tracking-[0.5em] font-ui font-bold uppercase mb-8 border-b border-black/10 pb-4">Manifest</div>
            <div className="border border-black/10 bg-muted/20">
              {o.order_items.map((it: any) => (
                <div key={it.id} className="flex gap-6 p-6 border-b border-black/10 last:border-b-0">
                  <div className="w-20 aspect-[3/4] bg-muted overflow-hidden flex-shrink-0">
                    <img src={it.image} className="w-full h-full object-cover grayscale" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="text-[11px] font-ui font-bold tracking-[0.1em] uppercase mb-1">{it.product_name}</div>
                    <div className="text-[9px] text-black/60 tracking-[0.2em] uppercase font-ui">
                      {it.variant_label} // QTY {it.quantity}
                    </div>
                    <div className="text-[11px] font-ui font-bold mt-4">{inr(it.price_at_purchase * it.quantity)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-12">
            <div>
              <div className="text-[10px] tracking-[0.5em] font-ui font-bold uppercase mb-8 border-b border-black/10 pb-4">Destination</div>
              <div className="text-[11px] font-ui font-bold tracking-[0.2em] uppercase mb-2">{o.shipping_address.full_name}</div>
              <div className="text-[10px] text-black/50 leading-relaxed font-ui uppercase tracking-[0.1em]">
                {o.shipping_address.line1}{o.shipping_address.line2 ? `, ${o.shipping_address.line2}` : ''}<br/>
                {o.shipping_address.city}, {o.shipping_address.state} {o.shipping_address.pincode}
              </div>
            </div>

            <div>
              <div className="text-[10px] tracking-[0.5em] font-ui font-bold uppercase mb-8 border-b border-black/10 pb-4">Settlement</div>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] tracking-[0.2em] uppercase font-ui font-bold text-black/60">
                  <span>Gross Value</span>
                  <span className="text-black">{inr(Number(o.subtotal))}</span>
                </div>
                {Number(o.discount) > 0 && (
                  <div className="flex justify-between text-[10px] tracking-[0.2em] uppercase font-ui font-bold text-accent">
                    <span>Voucher Applied</span>
                    <span>−{inr(Number(o.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px] tracking-[0.2em] uppercase font-ui font-bold text-black/60">
                  <span>Logistics</span>
                  <span className="text-black">{Number(o.shipping) === 0 ? 'COMPLIMENTARY' : inr(Number(o.shipping))}</span>
                </div>
                <div className="flex justify-between items-end pt-6 border-t border-black border-double">
                  <span className="text-[11px] tracking-[0.4em] uppercase font-ui font-bold">Net Total</span>
                  <span className="text-xl font-ui font-bold tracking-tighter">{inr(Number(o.total))}</span>
                </div>
              </div>
              <div className="text-[9px] text-black/50 tracking-[0.2em] uppercase font-ui mt-6 border-t border-black/10 pt-6">
                Method: {o.payment_method} // {o.payment_status}
              </div>
            </div>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}

