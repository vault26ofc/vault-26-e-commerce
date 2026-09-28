import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { inr, slugify } from '@/lib/format';
import { toast } from 'sonner';
import { Copy, Eye, EyeOff, Pencil, Plus, Trash2, Wand2, X } from 'lucide-react';
import { MediaListField } from '@/components/admin/MediaField';
import { buildVariantMatrix, duplicateVariantKeys, type Colour, type EditorVariant } from '@/lib/variants';

type ProductForm = {
  id?: string;
  name: string; slug: string; description: string;
  brand_id: string | null; category_id: string | null;
  material: string; care: string;
  is_active: boolean; is_featured: boolean;
  images: string[]; videos: string[];
  variants: EditorVariant[];
};

const empty: ProductForm = {
  name: '', slug: '', description: '', brand_id: null, category_id: null,
  material: '', care: '', is_active: true, is_featured: false, images: [], videos: [], variants: [],
};

const inputCls = 'w-full border border-border bg-transparent px-3 py-2 text-sm';
const smallInput = 'w-full border border-border bg-transparent px-2 py-1.5 text-sm';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs uppercase tracking-widest text-muted-foreground">
      {label}
      <div className="mt-1.5 normal-case tracking-normal text-foreground">{children}</div>
      {hint && <div className="mt-1 normal-case tracking-normal text-[11px]">{hint}</div>}
    </label>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border">
      <div className="px-4 py-3 border-b border-border bg-secondary flex items-center gap-3">
        <span className="h-6 w-6 bg-foreground text-background text-xs flex items-center justify-center">{n}</span>
        <span className="text-xs uppercase tracking-widest font-medium">{title}</span>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categorySizes, setCategorySizes] = useState<string[]>([]);
  const [lowStock, setLowStock] = useState(5);
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [sizesPicked, setSizesPicked] = useState<string[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);
  const [colourDraft, setColourDraft] = useState<Colour>({ name: '', hex: '#000000' });
  const [defaults, setDefaults] = useState({ price: 0, stock: 0 });
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, slug, is_active, is_featured, images, videos, category_id, brands(name), categories(name), product_variants(id, price, stock)')
      .order('created_at', { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => {
    load();
    supabase.from('brands').select('id, name').order('name').then(({ data }) => setBrands(data || []));
    supabase.from('categories').select('id, name').order('position').order('name').then(({ data }) => setCategories(data || []));
    supabase.from('settings').select('value').eq('key', 'low_stock_threshold').maybeSingle()
      .then(({ data }) => { if (data) setLowStock(Number(data.value) || 5); });
  }, []);

  useEffect(() => {
    if (!editing?.category_id) { setCategorySizes([]); return; }
    supabase.from('sizes').select('label').eq('category_id', editing.category_id).order('position')
      .then(({ data }) => setCategorySizes((data || []).map((s) => s.label)));
  }, [editing?.category_id]);

  const startEditing = (form: ProductForm) => {
    setEditing(form);
    setSizesPicked([...new Set(form.variants.map((v) => v.size).filter(Boolean))]);
    const cs = new Map<string, string>();
    form.variants.forEach((v) => { if (v.color && !cs.has(v.color)) cs.set(v.color, v.color_hex || '#000000'); });
    setColours([...cs].map(([name, hex]) => ({ name, hex })));
    setColourDraft({ name: '', hex: '#000000' });
    const first = form.variants[0];
    setDefaults({ price: first?.price ?? 0, stock: 0 });
  };

  const openNew = () => startEditing({ ...empty, category_id: activeCategory !== 'ALL' ? activeCategory : null });

  const loadForm = async (id: string): Promise<ProductForm | null> => {
    const { data: p } = await supabase.from('products').select('*').eq('id', id).single();
    const { data: v } = await supabase.from('product_variants').select('*').eq('product_id', id).order('created_at');
    if (!p) return null;
    return {
      id: p.id, name: p.name, slug: p.slug, description: p.description || '',
      brand_id: p.brand_id, category_id: p.category_id, material: p.material || '', care: p.care || '',
      is_active: p.is_active, is_featured: p.is_featured, images: p.images || [], videos: (p as any).videos || [],
      variants: (v || []).map((x) => ({
        id: x.id, size: x.size || '', color: x.color || '', color_hex: x.color_hex || '#000000',
        price: Number(x.price), compare_price: x.compare_price ? Number(x.compare_price) : null,
        stock: x.stock, original_stock: x.stock, sku: x.sku || '',
      })),
    };
  };

  const openEdit = async (id: string) => { const f = await loadForm(id); if (f) startEditing(f); };

  const duplicate = async (id: string) => {
    const f = await loadForm(id);
    if (!f) return;
    startEditing({
      ...f, id: undefined, name: `${f.name} (copy)`, slug: `${f.slug}-copy`, is_active: false,
      variants: f.variants.map(({ id: _id, original_stock: _o, ...v }) => ({ ...v, stock: 0, sku: '' })),
    });
    toast.info('Duplicated as a hidden draft — adjust and save');
  };

  const toggleActive = async (p: any) => {
    const { error } = await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success(p.is_active ? 'Hidden from the store' : 'Visible in the store');
    load();
  };

  const remove = async (p: any) => {
    if (p.is_active && confirm(`Hide "${p.name}" from the store instead of deleting it?\n\nHiding keeps its order history intact. OK = hide, Cancel = continue to delete.`)) {
      return toggleActive(p);
    }
    if (!confirm(`Permanently delete "${p.name}" and all its variants? Past orders keep their line items but lose the link to this product.`)) return;
    const { error } = await supabase.from('products').delete().eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const generate = () => {
    if (!editing) return;
    if (!sizesPicked.length && !colours.length) return toast.error('Pick at least one size or add a colour');
    // Keep the chosen order of sizes as defined for the category.
    const orderedSizes = [...categorySizes.filter((s) => sizesPicked.includes(s)), ...sizesPicked.filter((s) => !categorySizes.includes(s))];
    const next = buildVariantMatrix(orderedSizes, colours, editing.variants, defaults);
    const k = (v: EditorVariant) => `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`;
    const kept = new Set(next.map(k));
    const dropped = editing.variants.filter((v) => !kept.has(k(v)));
    if (dropped.length && !confirm(`${dropped.length} existing variant(s) are not in the new selection and will be removed when you save. Continue?`)) return;
    setEditing({ ...editing, variants: next });
  };

  const setVariant = (i: number, patch: Partial<EditorVariant>) => {
    if (!editing) return;
    const variants = editing.variants.slice();
    variants[i] = { ...variants[i], ...patch };
    setEditing({ ...editing, variants });
  };

  const applyToAll = (patch: Partial<EditorVariant>) => {
    if (!editing) return;
    setEditing({ ...editing, variants: editing.variants.map((v) => ({ ...v, ...patch })) });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error('Give the product a name');
    if (!editing.category_id) return toast.error('Choose a category');
    if (!editing.variants.length) return toast.error('Add at least one variant (step 3)');
    if (editing.variants.some((v) => !(v.price > 0))) return toast.error('Every variant needs a price above ₹0');
    const dups = duplicateVariantKeys(editing.variants);
    if (dups.length) return toast.error(`Duplicate variants: ${dups.join(', ')}`);
    if (!editing.images.length && !confirm('This product has no images. Save anyway?')) return;
    setSaving(true);
    const { error } = await supabase.rpc('save_product', {
      p_product: {
        id: editing.id ?? null, name: editing.name.trim(), slug: editing.slug.trim() || slugify(editing.name),
        description: editing.description, brand_id: editing.brand_id, category_id: editing.category_id,
        material: editing.material, care: editing.care, is_active: editing.is_active, is_featured: editing.is_featured,
        images: editing.images, videos: editing.videos,
      },
      p_variants: editing.variants.map((v) => ({
        id: v.id ?? null, size: v.size, color: v.color, color_hex: v.color_hex, price: v.price,
        compare_price: v.compare_price || null, stock: v.stock, sku: v.sku,
        ...(v.original_stock !== undefined ? { original_stock: v.original_stock } : {}),
      })),
    });
    setSaving(false);
    if (error) return toast.error(error.message.includes('duplicate key') ? 'That slug is already used by another product' : error.message);
    toast.success('Product saved');
    setEditing(null);
    load();
  };

  const filtered = products.filter((p) => {
    if (activeCategory !== 'ALL' && p.category_id !== activeCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const unpickedSizes = useMemo(() => sizesPicked.filter((s) => !categorySizes.includes(s)), [sizesPicked, categorySizes]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="font-display text-2xl md:text-3xl">Products <span className="text-muted-foreground text-sm font-sans">({filtered.length})</span></h1>
        <div className="flex items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="border border-border bg-transparent px-3 py-2 text-sm w-40 sm:w-56" />
          <button onClick={openNew} className="bg-foreground text-background px-3 sm:px-4 py-2 text-xs uppercase tracking-widest flex items-center gap-2"><Plus className="h-4 w-4" /> New product</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setActiveCategory('ALL')} className={`px-3 py-1.5 text-[11px] uppercase tracking-widest border ${activeCategory === 'ALL' ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground'}`}>All ({products.length})</button>
        {categories.map((c) => {
          const count = products.filter((p) => p.category_id === c.id).length;
          return (
            <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`px-3 py-1.5 text-[11px] uppercase tracking-widest border ${activeCategory === c.id ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground'}`}>
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-secondary"><tr>{['', 'Name', 'Category', 'Price from', 'Stock', 'Variants', 'Status', ''].map((h, i) => <th key={i} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((p) => {
              const vs = p.product_variants || [];
              const minP = vs.length ? Math.min(...vs.map((v: any) => Number(v.price))) : 0;
              const stock = vs.reduce((s: number, v: any) => s + v.stock, 0);
              const out = vs.filter((v: any) => v.stock === 0).length;
              const low = vs.filter((v: any) => v.stock > 0 && v.stock <= lowStock).length;
              return (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="p-3">{p.images?.[0] ? <img src={p.images[0]} alt="" className="w-10 h-12 object-cover" /> : <div className="w-10 h-12 bg-secondary" />}</td>
                  <td className="p-3">
                    <button onClick={() => openEdit(p.id)} className="text-left hover:underline">{p.name}</button>
                    {p.is_featured && <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">Featured</span>}
                    {(p.videos?.length ?? 0) > 0 && <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">Video</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">{p.categories?.name || <span className="text-destructive">No category</span>}</td>
                  <td className="p-3">{inr(minP)}</td>
                  <td className="p-3">
                    {stock}
                    {out > 0 && <div className="text-[10px] uppercase tracking-widest text-destructive">{out} sold out</div>}
                    {low > 0 && <div className="text-[10px] uppercase tracking-widest text-amber-700">{low} low</div>}
                  </td>
                  <td className="p-3">{vs.length}</td>
                  <td className="p-3">
                    <button onClick={() => toggleActive(p)} className="inline-flex items-center gap-1 text-xs hover:underline" title={p.is_active ? 'Hide from store' : 'Show in store'}>
                      {p.is_active ? <><Eye className="h-3.5 w-3.5" /> Live</> : <><EyeOff className="h-3.5 w-3.5" /> Hidden</>}
                    </button>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(p.id)} className="p-1.5 hover:bg-secondary" title="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => duplicate(p.id)} className="p-1.5 hover:bg-secondary" title="Duplicate"><Copy className="h-4 w-4" /></button>
                    <button onClick={() => remove(p)} className="p-1.5 hover:bg-secondary text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">
                {products.length ? 'No products match this view.' : <>No products yet. Start with <Link to="/admin/catalog" className="underline">categories</Link> and <Link to="/admin/sizes" className="underline">sizes</Link>, then click “New product”.</>}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setEditing(null)}>
          <div className="w-full sm:max-w-3xl bg-background h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-background z-10 gap-3">
              <h2 className="font-display text-2xl truncate">{editing.id ? `Edit · ${editing.name}` : 'New product'}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={save} disabled={saving} className="bg-foreground text-background px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setEditing(null)} aria-label="Close"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <Step n={1} title="Category & details">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Category *" hint="Sizes in step 3 come from this category.">
                    <select value={editing.category_id || ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })} className={inputCls}>
                      <option value="">Choose a category…</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Brand">
                    <select value={editing.brand_id || ''} onChange={(e) => setEditing({ ...editing, brand_id: e.target.value || null })} className={inputCls}>
                      <option value="">—</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Name *">
                    <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="URL slug" hint={editing.slug ? `/products/${editing.slug}` : undefined}>
                    <input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} className={inputCls} />
                  </Field>
                </div>
                <Field label="Description"><textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={4} className={inputCls} /></Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Material"><input value={editing.material} onChange={(e) => setEditing({ ...editing, material: e.target.value })} className={inputCls} /></Field>
                  <Field label="Care"><input value={editing.care} onChange={(e) => setEditing({ ...editing, care: e.target.value })} className={inputCls} /></Field>
                </div>
                <div className="flex gap-6 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Live in store</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> Featured</label>
                </div>
              </Step>

              <Step n={2} title="Photos & videos">
                <MediaListField label="Images (first one is the cover)" kind="image" folder="vault26/products" value={editing.images} onChange={(images) => setEditing({ ...editing, images })} />
                <MediaListField label="Videos (shown in the product gallery)" kind="video" folder="vault26/products" value={editing.videos} onChange={(videos) => setEditing({ ...editing, videos })} />
              </Step>

              <Step n={3} title="Sizes, colours & variants">
                {!editing.category_id ? (
                  <div className="text-sm text-muted-foreground">Choose a category in step 1 to see its sizes.</div>
                ) : (
                  <>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Sizes available</div>
                      {categorySizes.length === 0 ? (
                        <div className="text-sm text-muted-foreground">This category has no sizes yet. <Link to="/admin/sizes" className="underline">Add sizes</Link>, or leave empty for one-size products.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {categorySizes.map((s) => {
                            const on = sizesPicked.includes(s);
                            return (
                              <button key={s} type="button" onClick={() => setSizesPicked(on ? sizesPicked.filter((x) => x !== s) : [...sizesPicked, s])}
                                className={`min-w-[44px] px-3 py-1.5 text-xs border ${on ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-foreground'}`}>{s}</button>
                            );
                          })}
                          <button type="button" onClick={() => setSizesPicked(sizesPicked.length === categorySizes.length ? [] : categorySizes.slice())} className="px-3 py-1.5 text-[11px] uppercase tracking-widest underline">
                            {sizesPicked.length === categorySizes.length ? 'None' : 'All'}
                          </button>
                        </div>
                      )}
                      {unpickedSizes.length > 0 && <div className="text-[11px] text-muted-foreground mt-2">Also in use (not in this category's list): {unpickedSizes.join(', ')}</div>}
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Colours (optional)</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {colours.map((c, i) => (
                          <span key={`${c.name}-${i}`} className="inline-flex items-center gap-2 border border-border pl-2 pr-1 py-1 text-xs">
                            <input type="color" value={c.hex || '#000000'} onChange={(e) => setColours(colours.map((x, j) => j === i ? { ...x, hex: e.target.value } : x))} className="h-4 w-4 border-0 p-0 bg-transparent" />
                            {c.name}
                            <button type="button" onClick={() => setColours(colours.filter((_, j) => j !== i))} aria-label={`Remove ${c.name}`}><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="color" value={colourDraft.hex} onChange={(e) => setColourDraft({ ...colourDraft, hex: e.target.value })} className="h-9 w-10 border border-border" />
                        <input value={colourDraft.name} onChange={(e) => setColourDraft({ ...colourDraft, name: e.target.value })} placeholder="Colour name, e.g. Sand"
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget.nextSibling as HTMLButtonElement)?.click(); } }}
                          className="flex-1 border border-border bg-transparent px-3 py-2 text-sm" />
                        <button type="button" onClick={() => {
                          const name = colourDraft.name.trim();
                          if (!name) return;
                          if (colours.some((c) => c.name.toLowerCase() === name.toLowerCase())) return toast.error('That colour is already added');
                          setColours([...colours, { name, hex: colourDraft.hex }]);
                          setColourDraft({ name: '', hex: '#000000' });
                        }} className="border border-border px-3 text-xs uppercase tracking-widest hover:bg-secondary">Add</button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
                      <Field label="Default price (₹)"><input type="number" min={0} value={defaults.price} onChange={(e) => setDefaults({ ...defaults, price: Number(e.target.value) })} className={`${inputCls} w-32`} /></Field>
                      <Field label="Default stock"><input type="number" min={0} value={defaults.stock} onChange={(e) => setDefaults({ ...defaults, stock: Number(e.target.value) })} className={`${inputCls} w-28`} /></Field>
                      <button type="button" onClick={generate} className="bg-foreground text-background px-4 py-2 text-xs uppercase tracking-widest flex items-center gap-2"><Wand2 className="h-4 w-4" /> Generate variants</button>
                    </div>
                  </>
                )}

                {editing.variants.length > 0 && (
                  <div className="border border-border overflow-x-auto">
                    <div className="flex flex-wrap gap-3 items-center justify-between p-2 bg-secondary text-xs">
                      <span>{editing.variants.length} variant{editing.variants.length === 1 ? '' : 's'} · {editing.variants.reduce((s, v) => s + v.stock, 0)} in stock</span>
                      <span className="flex gap-3">
                        <button type="button" className="underline" onClick={() => { const v = prompt('Price for all variants (₹):'); if (v !== null && Number(v) > 0) applyToAll({ price: Number(v) }); }}>Set all prices</button>
                        <button type="button" className="underline" onClick={() => { const v = prompt('Stock for all variants:'); if (v !== null && Number(v) >= 0) applyToAll({ stock: Math.floor(Number(v)) }); }}>Set all stock</button>
                      </span>
                    </div>
                    <table className="w-full text-sm min-w-[620px]">
                      <thead><tr className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                        <th className="p-2">Size</th><th className="p-2">Colour</th><th className="p-2">Price ₹</th><th className="p-2">Compare ₹</th><th className="p-2">Stock</th><th className="p-2">SKU</th><th className="p-2"></th>
                      </tr></thead>
                      <tbody>
                        {editing.variants.map((v, i) => (
                          <tr key={v.id ?? `new-${i}`} className="border-t border-border">
                            <td className="p-2 w-20"><input value={v.size} onChange={(e) => setVariant(i, { size: e.target.value })} placeholder="One size" className={smallInput} /></td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <input type="color" value={v.color_hex || '#000000'} onChange={(e) => setVariant(i, { color_hex: e.target.value })} className="h-7 w-7 border border-border p-0" />
                                <input value={v.color} onChange={(e) => setVariant(i, { color: e.target.value })} placeholder="—" className={smallInput} />
                              </div>
                            </td>
                            <td className="p-2 w-24"><input type="number" min={0} value={v.price} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} className={`${smallInput} ${v.price > 0 ? '' : 'border-destructive'}`} /></td>
                            <td className="p-2 w-24"><input type="number" min={0} value={v.compare_price ?? ''} onChange={(e) => setVariant(i, { compare_price: e.target.value ? Number(e.target.value) : null })} placeholder="—" className={smallInput} /></td>
                            <td className="p-2 w-20"><input type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: Math.max(0, Math.floor(Number(e.target.value))) })} className={`${smallInput} ${v.stock === 0 ? 'text-destructive' : v.stock <= lowStock ? 'text-amber-700' : ''}`} /></td>
                            <td className="p-2 w-32"><input value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} placeholder="optional" className={smallInput} /></td>
                            <td className="p-2 w-8"><button type="button" onClick={() => setEditing({ ...editing, variants: editing.variants.filter((_, j) => j !== i) })} className="text-destructive p-1" aria-label="Remove variant"><Trash2 className="h-4 w-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button type="button" onClick={() => setEditing({ ...editing, variants: [...editing.variants, { size: '', color: '', color_hex: '#000000', price: defaults.price, compare_price: null, stock: 0, sku: '' }] })}
                  className="text-xs uppercase tracking-widest underline">+ Add a single variant manually</button>
              </Step>

              <div className="flex justify-end gap-3 pb-6">
                <button onClick={() => setEditing(null)} className="border border-border px-5 py-3 text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={save} disabled={saving} className="bg-foreground text-background px-5 py-3 text-xs uppercase tracking-widest disabled:opacity-50">{saving ? 'Saving…' : 'Save product'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
