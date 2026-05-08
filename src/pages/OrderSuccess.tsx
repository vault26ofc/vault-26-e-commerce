import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { motion } from 'framer-motion';

export default function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle().then(({ data }) => {
      setOrder(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="container-px py-48 text-center uppercase tracking-[0.5em] text-[10px] animate-pulse">Decrypting Order Data...</div>;
  if (!order) return <div className="container-px py-48 text-center uppercase tracking-[0.5em] text-[10px]">Order Not Found in Archive</div>;

  return (
    <div className="container-px py-32 flex flex-col items-center min-h-screen bg-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl w-full text-center"
      >
        <div className="w-20 h-20 border border-black/10 rounded-full flex items-center justify-center mx-auto mb-12">
          <ShieldCheck className="h-8 w-8 text-accent" strokeWidth={1} />
        </div>
        
        <span className="eyebrow block mb-4">Transaction Secured</span>
        <h1 className="display-2 italic font-elegant mb-8">Selection <span className="text-accent">Confirmed</span></h1>
        
        <p className="text-[11px] tracking-[0.2em] text-black/50 uppercase font-ui leading-relaxed mb-12">
          Order <span className="text-black font-bold">#{order.order_number}</span> has been logged into the Vault 26 Archive. 
          Expect dispatch logistics within 24–48 hours.
        </p>

        <div className="border border-black/10 bg-muted/20 p-8 text-left mb-12">
          <div className="text-[9px] tracking-[0.4em] uppercase font-ui font-bold text-black/50 mb-8 border-b border-black/10 pb-4">Order Contents</div>
          <div className="space-y-6">
            {order.order_items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-6">
                <div className="w-16 aspect-[3/4] bg-muted overflow-hidden">
                  <img src={it.image} className="w-full h-full object-cover grayscale" />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-ui font-bold tracking-[0.1em] uppercase mb-1">{it.product_name}</div>
                  <div className="text-[9px] text-black/60 tracking-[0.2em] uppercase font-ui">
                    {it.variant_label} · QTY {it.quantity}
                  </div>
                </div>
                <div className="text-[11px] font-ui font-bold">{inr(it.price_at_purchase * it.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-black border-double flex justify-between items-end">
             <span className="text-[10px] tracking-[0.3em] uppercase font-ui font-bold">Final Settlement</span>
             <span className="text-xl font-ui font-bold tracking-tighter">{inr(Number(order.total))}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center w-full">
          <Link to="/" className="flex-1 border border-black/20 py-5 text-[10px] tracking-[0.4em] uppercase font-ui font-bold hover:bg-black hover:text-white transition-all duration-500">
            Revisit Collection
          </Link>
          <Link to={`/orders/${order.id}`} className="flex-1 bg-black text-white py-5 text-[10px] tracking-[0.4em] uppercase font-ui font-bold hover:bg-accent transition-colors flex items-center justify-center gap-3">
            Archive Tracking <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

