import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProductPicker } from '@/components/admin/Pickers';
import { MediaField } from '@/components/admin/MediaField';
import { SearchSelect } from '@/components/admin/SearchSelect';
import { PAGES } from '@/lib/links';
import { inr } from '@/lib/format';
import { cn } from '@/lib/utils';
import { describeError } from '@/lib/errors';

// Generated types predate mega menu v2 columns; query these tables untyped.
const db = supabase as any;

type Category = { id: string; name: string; slug: string };
type Tab = { id: string; tab_type: 'category' | 'page' | 'custom'; category_id: string | null; custom_label: string | null; custom_href: string | null; position: number; is_active: boolean };
type LinkRow = { id: string; tab_id: string; category_id: string | null; custom_label: string | null; custom_href: string | null; position: number; is_visible: boolean; link_type: string };
type Featured = { id: string; tab_id: string; product_id: string; position: number };
type ProductLite = { id: string; slug: string; name: string; images: string[] | null; product_variants: { price: number }[] };

/** Native drag-and-drop reordering for a list; calls onMove(from, to). */
function useDrag(onMove: (from: number, to: number) => void) {
  const [dragging, setDragging] = useState<number | null>(null);
  return (i: number) => ({
    draggable: true,
    onDragStart: () => setDragging(i),
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: () => { if (dragging !== null && dragging !== i) onMove(dragging, i); setDragging(null); },
    onDragEnd: () => setDragging(null),
    className: dragging === i ? 'opacity-40' : '',
  });
}

const reorder = <T,>(list: T[], from: number, to: number) => {
  const next = list.slice();
  const [m] = next.splice(from, 1);
  next.splice(to, 0, m);
  return next;
};

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-card">
      <div className="px-4 pt-4">
        <div className="text-xs uppercase tracking-[0.2em]">Step {n} — {title}</div>
        <p className="text-xs text-muted-foreground mt-1 max-w-xl">{hint}</p>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </section>
  );
}

export default function AdminMegaMenu() {
  const [cats, setCats] = useState<Category[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [featured, setFeatured] = useState<Featured[]>([]);
  const [products, setProducts] = useState<Record<string, ProductLite>>({});
  const [managing, setManaging] = useState<string | null>(null);
  const [addCat, setAddCat] = useState('');
  // Step 4: full-screen menu extras (settings.menu_overlay), autosaved.
  const [overlay, setOverlay] = useState<{ statement?: string; product_slugs?: string[] }>({});
  const overlayTimer = useRef<number | null>(null);
  const updateOverlay = (next: typeof overlay) => {
    setOverlay(next);
    if (overlayTimer.current) window.clearTimeout(overlayTimer.current);
    overlayTimer.current = window.setTimeout(async () => {
      const { error } = await supabase.from('settings').upsert({ key: 'menu_overlay', value: next as any }, { onConflict: 'key' });
      if (error) toast.error(describeError(error)); else toast.success('Menu extras saved');
    }, 700);
  };

  const load = async () => {
    const [{ data: c }, { data: t }, { data: l }, { data: f }] = await Promise.all([
      supabase.from('categories').select('id, name, slug').order('position').order('name'),
      db.from('mega_menu_tabs').select('*').order('position'),
      db.from('mega_menu_links').select('*').order('position'),
      db.from('mega_menu_featured').select('*').order('position'),
    ]);
    setCats(c || []); setTabs(t || []); setLinks(l || []); setFeatured(f || []);
    const { data: ov } = await supabase.from('settings').select('value').eq('key', 'menu_overlay').maybeSingle();
    if (ov?.value) setOverlay(ov.value as any);
    const ids = (f || []).map((x: Featured) => x.product_id);
    if (ids.length) {
      const { data: p } = await supabase.from('products').select('id, slug, name, images, product_variants(price)').in('id', ids);
      setProducts(Object.fromEntries((p || []).map((x: any) => [x.id, x])));
    }
    setManaging((m) => m ?? t?.[0]?.id ?? null);
  };
  useEffect(() => { load(); }, []);

  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? '—';
  const tabLabel = (t: Tab) => (t.tab_type === 'category' ? catName(t.category_id) : t.custom_label || '');
  const run = async (p: PromiseLike<{ error: any }>, ok?: string) => {
    const { error } = await p;
    if (error) { toast.error(describeError(error)); await load(); return false; }
    if (ok) toast.success(ok);
    return true;
  };

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const tabValue = (t: Tab) => (t.tab_type === 'category' ? `cat:${t.category_id}` : `page:${t.custom_href}`);
  const changeTab = async (t: Tab, value: string) => {
    const [kind, v] = [value.slice(0, value.indexOf(':')), value.slice(value.indexOf(':') + 1)];
    const patch = kind === 'cat'
      ? { tab_type: 'category', category_id: v, custom_label: null, custom_href: null }
      : { tab_type: 'page', category_id: null, custom_href: v, custom_label: PAGES.find((p) => p.value === v)?.label ?? v };
    setTabs((ts) => ts.map((x) => (x.id === t.id ? { ...x, ...patch } as Tab : x)));
    await run(db.from('mega_menu_tabs').update(patch).eq('id', t.id), 'Tab saved');
  };
  const toggleTab = async (t: Tab) => {
    setTabs((ts) => ts.map((x) => (x.id === t.id ? { ...x, is_active: !x.is_active } : x)));
    await run(db.from('mega_menu_tabs').update({ is_active: !t.is_active }).eq('id', t.id), t.is_active ? 'Tab hidden' : 'Tab shown');
  };
  const addTab = async () => {
    const used = new Set(tabs.map((t) => t.category_id));
    const free = cats.find((c) => !used.has(c.id));
    if (!free) return toast.error('Every category already has a tab — add a page tab by changing an existing one, or create a category first');
    const { data, error } = await db.from('mega_menu_tabs').insert({ tab_type: 'category', category_id: free.id, position: tabs.length, is_active: false }).select().single();
    if (error) return toast.error(describeError(error));
    setTabs((ts) => [...ts, data]); setManaging(data.id);
    toast.success(`Added “${free.name}” (hidden until you tick Shown)`);
  };
  const removeTab = async (t: Tab) => {
    if (!confirm(`Remove the “${tabLabel(t)}” tab and its links and featured products?`)) return;
    setTabs((ts) => ts.filter((x) => x.id !== t.id));
    if (managing === t.id) setManaging(tabs.find((x) => x.id !== t.id)?.id ?? null);
    await run(db.from('mega_menu_tabs').delete().eq('id', t.id), 'Tab removed');
  };
  const saveOrder = async <T extends { id: string }>(table: string, list: T[]) => {
    await Promise.all(list.map((x, i) => db.from(table).update({ position: i }).eq('id', x.id)));
  };
  const dragTab = useDrag(async (from, to) => {
    const next = reorder(tabs, from, to);
    setTabs(next);
    await saveOrder('mega_menu_tabs', next);
    toast.success('Order saved');
  });

  // ── Links of the managed tab ────────────────────────────────────────────────
  const tab = tabs.find((t) => t.id === managing) ?? null;
  const tabLinks = useMemo(() => links.filter((l) => l.tab_id === managing).sort((a, b) => a.position - b.position), [links, managing]);
  const addLink = async () => {
    if (!tab || !addCat) return;
    const { data, error } = await db.from('mega_menu_links')
      .insert({ tab_id: tab.id, link_type: 'category', category_id: addCat, position: tabLinks.length, is_visible: true }).select().single();
    if (error) return toast.error(describeError(error));
    setLinks((ls) => [...ls, data]); setAddCat('');
    toast.success('Link added');
  };
  const toggleLink = async (l: LinkRow) => {
    setLinks((ls) => ls.map((x) => (x.id === l.id ? { ...x, is_visible: !x.is_visible } : x)));
    await run(db.from('mega_menu_links').update({ is_visible: !l.is_visible }).eq('id', l.id), 'Saved');
  };
  const removeLink = async (l: LinkRow) => {
    setLinks((ls) => ls.filter((x) => x.id !== l.id));
    await run(db.from('mega_menu_links').delete().eq('id', l.id), 'Link removed');
  };
  const dragLink = useDrag(async (from, to) => {
    const next = reorder(tabLinks, from, to).map((l, i) => ({ ...l, position: i }));
    setLinks((ls) => [...ls.filter((l) => l.tab_id !== managing), ...next]);
    await saveOrder('mega_menu_links', next);
    toast.success('Order saved');
  });

  // ── Featured products of the managed tab ────────────────────────────────────
  const tabFeatured = featured.filter((f) => f.tab_id === managing).sort((a, b) => a.position - b.position);
  const featuredSlugs = tabFeatured.map((f) => products[f.product_id]?.slug).filter(Boolean) as string[];
  const setFeaturedSlugs = async (slugs: string[]) => {
    if (!tab) return;
    const { data: ps } = await supabase.from('products').select('id, slug, name, images, product_variants(price)').in('slug', slugs.length ? slugs : ['__none__']);
    const bySlug = new Map((ps || []).map((p: any) => [p.slug, p]));
    setProducts((prev) => ({ ...prev, ...Object.fromEntries((ps || []).map((p: any) => [p.id, p])) }));
    const rows = slugs.map((s, i) => ({ tab_id: tab.id, product_id: (bySlug.get(s) as any)?.id, position: i })).filter((r) => r.product_id);
    const { error: delErr } = await db.from('mega_menu_featured').delete().eq('tab_id', tab.id);
    if (delErr) return toast.error(describeError(delErr));
    if (rows.length) {
      const { error } = await db.from('mega_menu_featured').insert(rows);
      if (error) { toast.error(describeError(error)); return load(); }
    }
    const { data: f } = await db.from('mega_menu_featured').select('*').order('position');
    setFeatured(f || []);
    toast.success('Featured products saved');
  };

  // ── Preview data ────────────────────────────────────────────────────────────
  const shownTabs = tabs.filter((t) => t.is_active);
  const previewLinks = tabLinks.filter((l) => l.is_visible);
  const previewProducts = tabFeatured.map((f) => products[f.product_id]).filter(Boolean);

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl">Mega Menu</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-2xl">
        Builds the dropdown that opens when a shopper hovers a navbar tab. Everything is picked from your categories, pages and products —
        nothing to type. <strong>Every change saves instantly.</strong> Drag the <GripVertical className="inline h-3.5 w-3.5" /> handle to reorder.
      </p>

      <div className="grid xl:grid-cols-[1fr_420px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Step n={1} title="Navbar tabs" hint="Each tab is a category (e.g. “Men”) or a page. Click MANAGE to set up what appears inside its dropdown.">
            {tabs.map((t, i) => {
              const d = dragTab(i);
              return (
                <div key={t.id} {...d} className={cn('flex items-center gap-2 border p-2 bg-background', managing === t.id ? 'border-foreground' : 'border-border', d.className)}>
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                  <SearchSelect className="flex-1 min-w-0" value={tabValue(t)} onChange={(v) => changeTab(t, v)} options={[
                    ...cats.map((c) => ({ value: `cat:${c.id}`, label: c.name, group: 'Categories' })),
                    ...PAGES.map((p) => ({ value: `page:${p.value}`, label: p.label, group: 'Pages' })),
                    ...(t.tab_type === 'custom' ? [{ value: `page:${t.custom_href}`, label: `${t.custom_label} (${t.custom_href})`, group: 'Pages' }] : []),
                  ]} />
                  <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest shrink-0">
                    <input type="checkbox" checked={t.is_active} onChange={() => toggleTab(t)} /> Shown
                  </label>
                  <button onClick={() => setManaging(t.id)}
                    className={cn('px-3 py-1.5 text-[11px] uppercase tracking-widest border shrink-0', managing === t.id ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-secondary')}>
                    {tabLabel(t)} {managing === t.id ? '✓' : '→'}
                  </button>
                  <button onClick={() => removeTab(t)} className="p-1.5 text-destructive shrink-0" aria-label="Remove tab"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
            <button onClick={addTab} className="border border-dashed border-border px-3 py-2 text-[11px] uppercase tracking-widest inline-flex items-center gap-1.5 hover:bg-secondary">
              <Plus className="h-3.5 w-3.5" /> Add tab
            </button>
          </Step>

          {tab && (
            <>
              <Step n={2} title={`Links inside “${tabLabel(tab)}”`} hint="The text links down the left side of this tab's dropdown. Pick any category — it doesn't have to belong to this tab.">
                {tabLinks.map((l, i) => {
                  const d = dragLink(i);
                  return (
                    <div key={l.id} {...d} className={cn('flex items-center gap-2 border border-border p-2 bg-background', d.className)}>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <span className={cn('flex-1 text-sm', !l.is_visible && 'text-muted-foreground line-through')}>
                        {l.category_id ? catName(l.category_id) : `${l.custom_label} (${l.custom_href})`}
                      </span>
                      <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest">
                        <input type="checkbox" checked={l.is_visible} onChange={() => toggleLink(l)} /> Shown
                      </label>
                      <button onClick={() => removeLink(l)} className="p-1.5 text-destructive" aria-label="Remove link"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  );
                })}
                <div className="flex gap-2 pt-1">
                  <SearchSelect className="flex-1" value={addCat} onChange={setAddCat} placeholder="— search a category to add —"
                    options={cats.filter((c) => !tabLinks.some((l) => l.category_id === c.id)).map((c) => ({ value: c.id, label: c.name }))} />
                  <button onClick={addLink} disabled={!addCat} className="border border-border px-3 text-[11px] uppercase tracking-widest disabled:opacity-40 hover:bg-secondary">
                    <Plus className="inline h-3.5 w-3.5" /> Add link
                  </button>
                </div>
              </Step>

              <Step n={3} title={`Featured products in “${tabLabel(tab)}”`} hint="2 products shown side by side next to the links (image, name and price come straight from the product).">
                <ProductPicker max={2} value={featuredSlugs} onChange={setFeaturedSlugs} />
              </Step>
            </>
          )}

          <Step n={4} title="Full-screen menu extras" hint="Shown when a shopper opens the full-screen menu (logo or ☰). Search and add up to 4 products. Saved automatically.">
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">Footer statement (one line per row)
              <textarea rows={2} value={overlay.statement ?? ''} placeholder={'THE ARCHIVE\nIS ALWAYS OPEN'}
                onChange={(e) => updateOverlay({ ...overlay, statement: e.target.value })}
                className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm normal-case tracking-normal" />
            </label>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">4 products shown along the bottom of the full-screen menu</div>
              <ProductPicker max={4} value={overlay.product_slugs ?? []} onChange={(product_slugs) => updateOverlay({ ...overlay, product_slugs })} />
            </div>
          </Step>
        </div>

        {/* Live preview */}
        <aside className="xl:sticky xl:top-4">
          <div className="text-[11px] uppercase tracking-[0.2em] mb-1">Live preview</div>
          <p className="text-xs text-muted-foreground mb-2">Exactly what shoppers see for the tab you're managing.</p>
          <div className="border border-border bg-white text-[#0F0F0F]">
            <div className="flex gap-4 px-4 py-3 border-b border-border overflow-x-auto text-sm">
              {shownTabs.map((t) => (
                <button key={t.id} onClick={() => setManaging(t.id)} className={cn('whitespace-nowrap lowercase first-letter:uppercase', t.id === managing ? 'font-bold' : 'text-black/60')}>
                  {tabLabel(t)}
                </button>
              ))}
              {!shownTabs.length && <span className="text-black/40">No tabs shown yet</span>}
            </div>
            {tab && (
              <div className="grid grid-cols-[1fr_1.4fr] min-h-[260px]">
                <ul className="p-4 space-y-3 text-sm border-r border-border">
                  {previewLinks.map((l) => <li key={l.id}>{l.category_id ? catName(l.category_id) : l.custom_label}</li>)}
                  {!previewLinks.length && <li className="text-black/40">No links yet</li>}
                </ul>
                <div className="p-3 grid grid-cols-2 gap-2">
                  {previewProducts.map((p) => (
                    <div key={p!.id}>
                      <div className="aspect-[3/4] bg-[#F1F1F1] overflow-hidden">{p!.images?.[0] && <img src={p!.images[0]} alt="" className="w-full h-full object-cover" />}</div>
                      <div className="text-[11px] mt-1 truncate">{p!.name}</div>
                      <div className="text-[11px] font-bold">{inr((p!.product_variants || []).reduce((m, v) => Math.min(m, Number(v.price)), Infinity) || 0)}</div>
                    </div>
                  ))}
                  {!previewProducts.length && <div className="col-span-2 text-xs text-black/40 self-center text-center">No featured products yet</div>}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
