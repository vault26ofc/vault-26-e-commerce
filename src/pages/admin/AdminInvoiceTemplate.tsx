import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

const FIELDS: { k: string; l: string; type?: string; full?: boolean }[] = [
  { k: 'company_name', l: 'Company name' },
  { k: 'tagline', l: 'Tagline' },
  { k: 'logo_url', l: 'Logo URL', full: true },
  { k: 'address_line1', l: 'Address line 1', full: true },
  { k: 'address_line2', l: 'Address line 2', full: true },
  { k: 'city', l: 'City' },
  { k: 'state', l: 'State' },
  { k: 'pincode', l: 'Pincode' },
  { k: 'country', l: 'Country' },
  { k: 'phone', l: 'Phone' },
  { k: 'email', l: 'Email' },
  { k: 'website', l: 'Website' },
  { k: 'gstin', l: 'GSTIN' },
  { k: 'invoice_prefix', l: 'Invoice prefix' },
  { k: 'tax_label', l: 'Tax label (e.g. GST)' },
  { k: 'tax_rate', l: 'Tax rate (%)', type: 'number' },
  { k: 'primary_color', l: 'Primary color', type: 'color' },
  { k: 'accent_color', l: 'Accent color', type: 'color' },
];

export default function AdminInvoiceTemplate() {
  const [tpl, setTpl] = useState<Record<string, any>>({});
  const [sampleOrderId, setSampleOrderId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'invoice')
      .maybeSingle()
      .then(({ data }) => setTpl((data?.value as any) || {}));
    supabase
      .from('orders')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSampleOrderId(data?.id || null));
  }, []);

  const set = (k: string, v: any) => setTpl((t) => ({ ...t, [k]: v }));

  const save = async () => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'invoice', value: tpl, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success('Invoice template saved');
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Invoice Template</h1>
        {sampleOrderId && (
          <Link
            to={`/invoice/${sampleOrderId}`}
            target="_blank"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest border border-border px-3 py-2"
          >
            Preview <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.k} className={f.full ? 'md:col-span-2' : ''}>
            <label className="eyebrow">{f.l}</label>
            <input
              type={f.type || 'text'}
              value={tpl[f.k] ?? ''}
              onChange={(e) =>
                set(f.k, f.type === 'number' ? Number(e.target.value) : e.target.value)
              }
              className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm"
            />
          </div>
        ))}

        <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!tpl.show_tax}
            onChange={(e) => set('show_tax', e.target.checked)}
          />
          Show tax breakdown on invoice
        </label>

        <div className="md:col-span-2">
          <label className="eyebrow">Terms &amp; conditions</label>
          <textarea
            rows={4}
            value={tpl.terms ?? ''}
            onChange={(e) => set('terms', e.target.value)}
            className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="md:col-span-2">
          <label className="eyebrow">Footer note</label>
          <input
            value={tpl.footer_note ?? ''}
            onChange={(e) => set('footer_note', e.target.value)}
            className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        onClick={save}
        className="mt-8 bg-foreground text-background px-6 py-3 text-xs uppercase tracking-widest"
      >
        Save template
      </button>
    </div>
  );
}
