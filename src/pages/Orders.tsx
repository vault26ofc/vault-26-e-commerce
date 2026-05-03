import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_LABELS = ['PENDING','PACKED','SHIPPED','DELIVERED'];

export function OrdersList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from('orders').select('*, order_items(image, product_name, quantity)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setOrders(data || []));
  }, [user]);
  if (!user) return <div className="container-px py-20 text-center">Please <Link to="/login" className="link-underline">sign in</Link>.</div>;
  return (
    <div className="container-px py-12 max-w-4xl">
      <span className="eyebrow">Account</span>
      <h1 className="display-2 mt-2 mb-10">Orders</h1>
      {orders.length === 0 ? (
        <div className="text-muted-foreground text-center py-16">No orders yet.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="block border border-border p-5 hover:border-foreground transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="text-sm font-medium">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()} · {o.order_items.length} items</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{inr(Number(o.total))}</div>
                  <span className="inline-block mt-1 text-[10px] uppercase tracking-widest bg-secondary px-2 py-1">{o.status}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                {o.order_items.slice(0, 4).map((it: any, i: number) => <img key={i} src={it.image} className="w-12 h-14 object-cover" />)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState<any>(null);
  useEffect(() => {
    if (!id) return;
    supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle().then(({ data }) => setO(data));
  }, [id]);
  if (!o) return <div className="container-px py-20 text-center">Loading…</div>;
  const stage = STATUS_LABELS.indexOf(o.status);
  return (
    <div className="container-px py-12 max-w-3xl">
      <span className="eyebrow">{o.order_number}</span>
      <h1 className="display-2 mt-2">Order details</h1>
      <p className="text-sm text-muted-foreground mt-1">Placed on {new Date(o.created_at).toLocaleDateString()}</p>

      {/* Timeline */}
      {o.status !== 'CANCELLED' && (
        <div className="mt-8 grid grid-cols-4 gap-2">
          {STATUS_LABELS.map((s, i) => (
            <div key={s} className="text-center">
              <div className={cn('h-1 mb-2', i <= stage ? 'bg-accent' : 'bg-border')} />
              <div className={cn('text-[10px] uppercase tracking-widest', i <= stage ? 'text-foreground' : 'text-muted-foreground')}>{s}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 border border-border">
        {o.order_items.map((it: any) => (
          <div key={it.id} className="flex gap-4 p-4 border-b border-border last:border-b-0">
            <img src={it.image} className="w-16 h-20 object-cover" />
            <div className="flex-1"><div className="text-sm">{it.product_name}</div><div className="text-xs text-muted-foreground">{it.variant_label} · Qty {it.quantity}</div></div>
            <div className="text-sm">{inr(it.price_at_purchase * it.quantity)}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-6 text-sm">
        <div>
          <div className="eyebrow mb-2">Shipping</div>
          <div>{o.shipping_address.full_name}</div>
          <div className="text-muted-foreground">{o.shipping_address.line1}, {o.shipping_address.city}, {o.shipping_address.state} {o.shipping_address.pincode}</div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{inr(Number(o.subtotal))}</span></div>
          {Number(o.discount) > 0 && <div className="flex justify-between text-accent"><span>Discount</span><span>−{inr(Number(o.discount))}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{Number(o.shipping) === 0 ? 'Free' : inr(Number(o.shipping))}</span></div>
          <div className="flex justify-between font-medium pt-2 border-t border-border"><span>Total</span><span>{inr(Number(o.total))}</span></div>
          <div className="text-xs text-muted-foreground pt-2">Payment: {o.payment_method} · {o.payment_status}</div>
        </div>
      </div>
    </div>
  );
}
