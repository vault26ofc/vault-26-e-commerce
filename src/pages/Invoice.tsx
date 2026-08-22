import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { Printer, Download } from 'lucide-react';

type InvoiceSettings = {
  company_name?: string;
  tagline?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  gstin?: string;
  logo_url?: string;
  footer_note?: string;
  terms?: string;
  tax_rate?: number;
  tax_label?: string;
  show_tax?: boolean;
  invoice_prefix?: string;
  primary_color?: string;
  accent_color?: string;
};

export default function Invoice() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [tpl, setTpl] = useState<InvoiceSettings>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: o }, { data: s }] = await Promise.all([
        supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle(),
        supabase.from('settings').select('value').eq('key', 'invoice').maybeSingle(),
      ]);
      setOrder(o);
      setTpl((s?.value as InvoiceSettings) || {});
      setReady(true);
    })();
  }, [id]);

  if (!ready) return <div className="p-10 text-center">Loading…</div>;
  if (!order) return <div className="p-10 text-center text-muted-foreground">Invoice not found.</div>;

  const addr = order.shipping_address || {};
  const subtotal = Number(order.subtotal);
  const discount = Number(order.discount);
  const shipping = Number(order.shipping);
  const taxable = Math.max(subtotal - discount, 0);
  const taxRate = Number(tpl.tax_rate || 0);
  const taxAmt = tpl.show_tax ? Math.round((taxable * taxRate) / 100) : 0;
  const total = Number(order.total);
  const primary = tpl.primary_color || '#0f172a';
  const accent = tpl.accent_color || '#b08d57';
  const invoiceNo = `${tpl.invoice_prefix || 'INV-'}${order.order_number}`;

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white py-8 print:py-0">
      <div className="max-w-3xl mx-auto px-4 print:px-0">
        {/* Toolbar - hidden on print */}
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2 text-xs uppercase tracking-widest"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-widest"
          >
            <Download className="h-4 w-4" /> Save PDF
          </button>
        </div>

        {/* Invoice paper */}
        <div className="bg-white shadow-lg print:shadow-none p-10 print:p-8" id="invoice">
          {/* Header */}
          <div
            className="flex justify-between items-start pb-6 border-b-2"
            style={{ borderColor: primary }}
          >
            <div>
              {tpl.logo_url ? (
                <img src={tpl.logo_url} alt={tpl.company_name} className="h-12 mb-3 object-contain" />
              ) : null}
              <div className="text-2xl font-semibold tracking-tight" style={{ color: primary }}>
                {tpl.company_name || 'Vault 26'}
              </div>
              {tpl.tagline && <div className="text-xs text-neutral-500 mt-0.5">{tpl.tagline}</div>}
              <div className="text-xs text-neutral-600 mt-3 leading-relaxed">
                {tpl.address_line1 && <div>{tpl.address_line1}</div>}
                {tpl.address_line2 && <div>{tpl.address_line2}</div>}
                {(tpl.city || tpl.state || tpl.pincode) && (
                  <div>
                    {[tpl.city, tpl.state, tpl.pincode].filter(Boolean).join(', ')}
                  </div>
                )}
                {tpl.country && <div>{tpl.country}</div>}
                {tpl.phone && <div>Tel: {tpl.phone}</div>}
                {tpl.email && <div>{tpl.email}</div>}
                {tpl.website && <div>{tpl.website}</div>}
                {tpl.gstin && <div className="font-medium mt-1">GSTIN: {tpl.gstin}</div>}
              </div>
            </div>
            <div className="text-right">
              <div
                className="inline-block px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-white"
                style={{ background: accent }}
              >
                Tax Invoice
              </div>
              <div className="text-xl font-semibold mt-3" style={{ color: primary }}>
                {invoiceNo}
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Date: {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div className="text-xs text-neutral-500">Order: {order.order_number}</div>
              <div className="text-xs text-neutral-500 mt-2">
                Payment: <span className="font-medium">{order.payment_method}</span>
              </div>
              <div className="text-xs">
                Status:{' '}
                <span
                  className="font-medium"
                  style={{ color: order.payment_status === 'PAID' ? '#15803d' : '#b45309' }}
                >
                  {order.payment_status}
                </span>
              </div>
            </div>
          </div>

          {/* Bill to */}
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Bill To</div>
              <div className="text-sm font-semibold" style={{ color: primary }}>
                {addr.full_name}
              </div>
              <div className="text-xs text-neutral-600 mt-1 leading-relaxed">
                <div>{addr.line1}</div>
                {addr.line2 && <div>{addr.line2}</div>}
                <div>
                  {addr.city}, {addr.state} {addr.pincode}
                </div>
                {addr.phone && <div>Tel: {addr.phone}</div>}
                <div>{order.email}</div>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Ship To</div>
              <div className="text-sm font-semibold" style={{ color: primary }}>
                {addr.full_name}
              </div>
              <div className="text-xs text-neutral-600 mt-1 leading-relaxed">
                <div>{addr.line1}</div>
                {addr.line2 && <div>{addr.line2}</div>}
                <div>
                  {addr.city}, {addr.state} {addr.pincode}
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <table className="w-full mt-8 text-sm">
            <thead>
              <tr style={{ background: primary, color: '#fff' }}>
                <th className="text-left p-2.5 text-[10px] uppercase tracking-widest font-medium w-10">#</th>
                <th className="text-left p-2.5 text-[10px] uppercase tracking-widest font-medium">Item</th>
                <th className="text-right p-2.5 text-[10px] uppercase tracking-widest font-medium w-16">Qty</th>
                <th className="text-right p-2.5 text-[10px] uppercase tracking-widest font-medium w-24">Rate</th>
                <th className="text-right p-2.5 text-[10px] uppercase tracking-widest font-medium w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items.map((it: any, i: number) => (
                <tr key={it.id} className="border-b border-neutral-200">
                  <td className="p-2.5 text-neutral-500">{i + 1}</td>
                  <td className="p-2.5">
                    <div className="font-medium">{it.product_name}</div>
                    {it.variant_label && (
                      <div className="text-xs text-neutral-500">{it.variant_label}</div>
                    )}
                  </td>
                  <td className="p-2.5 text-right">{it.quantity}</td>
                  <td className="p-2.5 text-right">{inr(Number(it.price_at_purchase))}</td>
                  <td className="p-2.5 text-right font-medium">
                    {inr(Number(it.price_at_purchase) * it.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mt-4">
            <div className="w-72 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-neutral-600">Subtotal</span>
                <span>{inr(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1" style={{ color: accent }}>
                  <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                  <span>−{inr(discount)}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-neutral-600">Shipping</span>
                <span>{shipping === 0 ? 'Free' : inr(shipping)}</span>
              </div>
              {tpl.show_tax && taxRate > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-neutral-600">
                    {tpl.tax_label || 'Tax'} ({taxRate}%)
                  </span>
                  <span>{inr(taxAmt)}</span>
                </div>
              )}
              <div
                className="flex justify-between py-2 mt-1 border-t-2 text-base font-semibold"
                style={{ borderColor: primary, color: primary }}
              >
                <span>Total</span>
                <span>{inr(total)}</span>
              </div>
              {order.payment_method === 'COD' && Number(order.cod_advance_amount) > 0 && (
                <div className="text-xs text-neutral-500 mt-2">
                  Advance paid: {inr(Number(order.cod_advance_amount))} · Due on delivery:{' '}
                  {inr(total - Number(order.cod_advance_amount))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {(tpl.terms || tpl.footer_note) && (
            <div className="mt-10 pt-6 border-t border-neutral-200">
              {tpl.terms && (
                <div className="mb-4">
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                    Terms & Conditions
                  </div>
                  <div className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                    {tpl.terms}
                  </div>
                </div>
              )}
              {tpl.footer_note && (
                <div
                  className="text-center text-xs italic mt-6 pt-4 border-t border-neutral-100"
                  style={{ color: primary }}
                >
                  {tpl.footer_note}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
