import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const REFUND_STATUSES = ['NONE', 'REQUESTED', 'PROCESSING', 'REFUNDED', 'REJECTED'] as const;

export default function AdminRefunds() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'ALL' | 'REFUNDED'>('PENDING');
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ refund_status: 'REQUESTED', refund_amount: 0, refund_notes: '' });

  const load = async () => {
    let q = supabase.from('orders').select('*').order('updated_at', { ascending: false });
    if (filter === 'PENDING') q = q.in('refund_status', ['REQUESTED', 'PROCESSING'] as any);
    else if (filter === 'REFUNDED') q = q.eq('refund_status', 'REFUNDED' as any);
    else q = q.neq('refund_status', 'NONE' as any);
    const { data } = await q;
    setOrders(data || []);
  };

  useEffect(() => { load(); }, [filter]);

  const openEdit = (o: any) => {
    setEditing(o);
    setForm({
      refund_status: o.refund_status === 'NONE' ? 'REQUESTED' : o.refund_status,
      refund_amount: Number(o.refund_amount) || Number(o.total),
      refund_notes: o.refund_notes || '',
    });
  };

  const save = async () => {
    if (!editing) return;
    const patch: any = {
      refund_status: form.refund_status,
      refund_amount: form.refund_amount,
      refund_notes: form.refund_notes,
    };
    if (form.refund_status === 'REFUNDED') patch.refunded_at = new Date().toISOString();
    const { error } = await supabase.from('orders').update(patch).eq('id', editing.id);
    if (error) return toast.error(error.message);
    toast.success('Refund updated');
    setEditing(null);
    load();
  };

  const initiate = async (o: any) => {
    const { error } = await supabase.from('orders').update({
      refund_status: 'REQUESTED' as any,
      refund_amount: Number(o.total),
    }).eq('id', o.id);
    if (error) return toast.error(error.message);
    toast.success('Refund requested');
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Refunds</h1>
          <p className="text-sm text-muted-foreground mt-1">Process and track customer refunds.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="border border-border bg-transparent px-3 py-2 text-sm">
          <option value="PENDING">Pending refunds</option>
          <option value="REFUNDED">Completed</option>
          <option value="ALL">All refunds</option>
        </select>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>{['Order', 'Email', 'Order total', 'Refund', 'Status', 'Updated', ''].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No refunds in this view.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3"><Link to={`/invoice/${o.id}`} target="_blank" className="underline">{o.order_number}</Link></td>
                <td className="p-3">{o.email}</td>
                <td className="p-3">{inr(Number(o.total))}</td>
                <td className="p-3">{inr(Number(o.refund_amount) || 0)}</td>
                <td className="p-3"><span className="text-xs px-2 py-1 bg-secondary rounded">{o.refund_status}</span></td>
                <td className="p-3 text-muted-foreground text-xs">{new Date(o.updated_at).toLocaleString()}</td>
                <td className="p-3"><Button size="sm" variant="outline" onClick={() => openEdit(o)}>Manage</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl mb-3">Initiate refund for an order</h2>
        <p className="text-sm text-muted-foreground mb-4">Cancelled orders awaiting refund:</p>
        <CancelledOrders onInitiate={initiate} />
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund · {editing?.order_number}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Customer: {editing.email} · Paid via {editing.payment_method} ({editing.payment_status})
                {editing.razorpay_payment_id && <div className="text-xs mt-1">Payment ID: {editing.razorpay_payment_id}</div>}
              </div>
              <div>
                <Label>Status</Label>
                <select value={form.refund_status} onChange={(e) => setForm({ ...form, refund_status: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm mt-1">
                  {REFUND_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Refund amount (₹)</Label>
                <Input type="number" min={0} step="0.01" value={form.refund_amount} onChange={(e) => setForm({ ...form, refund_amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Notes (visible to customer)</Label>
                <Textarea value={form.refund_notes} onChange={(e) => setForm({ ...form, refund_notes: e.target.value })} rows={3} placeholder="Refund reference, ETA, etc." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Close</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CancelledOrders({ onInitiate }: { onInitiate: (o: any) => void }) {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('orders').select('*').eq('status', 'CANCELLED' as any).eq('refund_status', 'NONE' as any).then(({ data }) => setList(data || []));
  }, []);
  if (list.length === 0) return <div className="text-sm text-muted-foreground border border-border p-4">No cancelled orders awaiting refund.</div>;
  return (
    <div className="border border-border divide-y divide-border">
      {list.map((o) => (
        <div key={o.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-medium">{o.order_number} · {inr(Number(o.total))}</div>
            <div className="text-xs text-muted-foreground">{o.email} · {o.payment_method} {o.payment_status}</div>
          </div>
          <Button size="sm" onClick={() => onInitiate(o)}>Start refund</Button>
        </div>
      ))}
    </div>
  );
}
