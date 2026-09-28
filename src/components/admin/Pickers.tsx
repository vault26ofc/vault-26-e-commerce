import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { moveItem } from '@/lib/media';
import { PAGES, type LinkTarget, type LinkValue } from '@/lib/links';
import { cn } from '@/lib/utils';

type ProductLite = { id: string; slug: string; name: string; images: string[] | null; is_active: boolean; category_id: string | null };
type CategoryLite = { id: string; slug: string; name: string };

function useCategories() {
  const [cats, setCats] = useState<CategoryLite[]>([]);
  useEffect(() => {
    supabase.from('categories').select('id, slug, name').order('position').order('name').then(({ data }) => setCats(data || []));
  }, []);
  return cats;
}

/** Search box + category filter; shows matching products to click. */
function ProductSearch({ exclude, onPick }: { exclude: string[]; onPick: (p: ProductLite) => void }) {
  const cats = useCategories();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [results, setResults] = useState<ProductLite[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      let query = supabase.from('products').select('id, slug, name, images, is_active, category_id').order('name').limit(20);
      if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
      if (cat) {
        const { data: extra } = await supabase.from('product_categories').select('product_id').eq('category_id', cat);
        const ids = (extra || []).map((e) => e.product_id);
        query = ids.length ? query.or(`category_id.eq.${cat},id.in.(${ids.join(',')})`) : query.eq('category_id', cat);
      }
      const { data } = await query;
      setResults((data || []) as ProductLite[]);
    }, 200);
    return () => clearTimeout(t);
  }, [q, cat, open]);

  const visible = results.filter((r) => !exclude.includes(r.slug));
  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 border border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            placeholder="Search products to add…" className="w-full bg-transparent py-2.5 text-sm outline-none" />
        </div>
        <select value={cat} onChange={(e) => { setCat(e.target.value); setOpen(true); }} className="border border-border bg-transparent px-2 text-sm max-w-[40%]">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-background border border-border max-h-72 overflow-y-auto shadow-lg">
          <div className="flex justify-between items-center px-3 py-1.5 border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">
            <span>{visible.length ? 'Click to add' : 'No matching products'}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close results"><X className="h-3.5 w-3.5" /></button>
          </div>
          {visible.map((p) => (
            <button key={p.id} type="button" onClick={() => onPick(p)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary text-left">
              {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-8 h-10 object-cover" /> : <div className="w-8 h-10 bg-secondary" />}
              <span className="text-sm flex-1">{p.name}</span>
              {!p.is_active && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Hidden</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Pick any number of products by search; stored as ordered slugs. */
export function ProductPicker({ value, onChange, max }: { value: string[]; onChange: (slugs: string[]) => void; max?: number }) {
  const slugs = value || [];
  const [info, setInfo] = useState<Record<string, ProductLite>>({});
  useEffect(() => {
    const missing = slugs.filter((s) => !info[s]);
    if (!missing.length) return;
    supabase.from('products').select('id, slug, name, images, is_active, category_id').in('slug', missing)
      .then(({ data }) => setInfo((prev) => ({ ...prev, ...Object.fromEntries((data || []).map((p) => [p.slug, p as ProductLite])) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join(',')]);
  const full = max !== undefined && slugs.length >= max;
  return (
    <div className="space-y-2">
      {slugs.length > 0 && (
        <div className="border border-border divide-y divide-border">
          {slugs.map((s, i) => {
            const p = info[s];
            return (
              <div key={s} className="flex items-center gap-3 px-3 py-2">
                <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                {p?.images?.[0] ? <img src={p.images[0]} alt="" className="w-8 h-10 object-cover" /> : <div className="w-8 h-10 bg-secondary" />}
                <span className="text-sm flex-1">{p?.name ?? s}{p && !p.is_active && <span className="ml-2 text-[10px] uppercase tracking-widest text-destructive">Hidden — won't show</span>}</span>
                <button type="button" onClick={() => onChange(moveItem(slugs, i, -1))} disabled={i === 0} className="p-1 disabled:opacity-30" aria-label="Move up"><ChevronUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => onChange(moveItem(slugs, i, 1))} disabled={i === slugs.length - 1} className="p-1 disabled:opacity-30" aria-label="Move down"><ChevronDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => onChange(slugs.filter((x) => x !== s))} className="p-1 text-destructive" aria-label="Remove"><X className="h-4 w-4" /></button>
              </div>
            );
          })}
        </div>
      )}
      {full
        ? <div className="text-xs text-muted-foreground">Maximum of {max} reached — remove one to add another.</div>
        : <ProductSearch exclude={slugs} onPick={(p) => { setInfo((prev) => ({ ...prev, [p.slug]: p })); onChange([...slugs, p.slug]); }} />}
    </div>
  );
}

/** One category, stored by slug. */
export function CategorySelect({ value, onChange, placeholder = 'Choose a category…' }: { value: string; onChange: (slug: string) => void; placeholder?: string }) {
  const cats = useCategories();
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full border border-border bg-transparent px-3 py-2 text-sm">
      <option value="">{placeholder}</option>
      {cats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
    </select>
  );
}

/** Where a button goes: a product, a category or a fixed page — picked, never typed. */
export function LinkPicker({ value, onChange }: { value: LinkValue; onChange: (v: LinkTarget | '') => void }) {
  const current: LinkTarget | null = value && typeof value === 'object' ? value : null;
  const legacy = typeof value === 'string' && value ? value : null;
  const [type, setType] = useState<LinkTarget['type']>(current?.type ?? (legacy?.startsWith('/products/') ? 'product' : legacy?.startsWith('/category/') ? 'category' : 'page'));
  const set = (v: string, label?: string) => onChange(v ? { type, value: v, label } : '');
  return (
    <div className="space-y-2">
      <div className="inline-flex border border-border">
        {(['product', 'category', 'page'] as const).map((t) => (
          <button key={t} type="button" onClick={() => { setType(t); if (current?.type !== t) onChange(''); }}
            className={cn('px-3 py-1.5 text-[11px] uppercase tracking-widest', type === t ? 'bg-foreground text-background' : 'hover:bg-secondary')}>{t}</button>
        ))}
      </div>
      {type === 'product' && <ProductPicker max={1} value={current?.type === 'product' && current.value ? [current.value] : []} onChange={(s) => set(s[0] ?? '')} />}
      {type === 'category' && <CategorySelect value={current?.type === 'category' ? current.value : ''} onChange={(s) => set(s)} />}
      {type === 'page' && (
        <select value={current?.type === 'page' ? current.value : ''} onChange={(e) => set(e.target.value, PAGES.find((p) => p.value === e.target.value)?.label)}
          className="w-full border border-border bg-transparent px-3 py-2 text-sm">
          <option value="">Choose a page…</option>
          {PAGES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      )}
      {legacy && !current && <div className="text-[11px] text-muted-foreground">Currently links to <code>{legacy}</code>. Pick above to replace it.</div>}
    </div>
  );
}
