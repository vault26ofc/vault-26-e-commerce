import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';

export default function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  useEffect(() => {
    if (!id) return;
    supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle().then(({ data }) => setOrder(data));
  }, [id]);
  if (!order) return <div className="container-px py-20 text-center">Loading…</div>;
  return (
    <div className="container-px py-20 max-w-2xl text-center">
      <CheckCircle2 className="h-14 w-14 mx-auto text-accent" />
      <h1 className="display-2 mt-5">Thank you</h1>
      <p className="text-muted-foreground mt-2">Your order <span className="text-foreground">{order.order_number}</span> has been placed.</p>
      <p className="text-sm text-muted-foreground mt-1">Estimated delivery in 4–7 days.</p>
      <div className="mt-8 border border-border text-left">
        {order.order_items.map((it: any) => (
          <div key={it.id} className="flex items-center gap-4 p-4 border-b border-border last:border-b-0">
            <img src={it.image} className="w-14 h-16 object-cover" />
            <div className="flex-1 text-sm"><div>{it.product_name}</div><div className="text-xs text-muted-foreground">{it.variant_label} · Qty {it.quantity}</div></div>
            <div className="text-sm">{inr(it.price_at_purchase * it.quantity)}</div>
          </div>
        ))}
        <div className="p-4 flex justify-between font-medium"><span>Total</span><span>{inr(Number(order.total))}</span></div>
      </div>
      <div className="mt-8 flex gap-3 justify-center">
        <Link to="/" className="border border-foreground py-3 px-6 text-xs uppercase tracking-widest">Continue Shopping</Link>
        <Link to={`/orders/${order.id}`} className="bg-foreground text-background py-3 px-6 text-xs uppercase tracking-widest">Track Order</Link>
      </div>
    </div>
  );
}
