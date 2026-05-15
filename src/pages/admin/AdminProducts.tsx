import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react';

type Variant = { id?: string; size: string; color: string; color_hex: string; price: number; compare_price?: number | null; stock: number; sku?: string };
type ProductForm = {
  id?: string;
  name: string; slug: string; description: string;
  brand_id: string | null; category_id: string | null;
  material: string; care: string;
  is_active: boolean; is_featured: boolean;
  images: string[];
  variants: Variant[];
};

const empty: ProductForm = {
  name: '', slug: '', description: '', brand_id: null, category_id: null,
  material: '', care: '', is_active: true, is_featured: false, images: [], variants: [],
};

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, slug, is_active, is_featured, images, category_id, brands(name), categories(name), product_variants(id, price, stock)')
      .order('created_at', { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => {
    load();
    supabase.from('brands').select('id, name').order('name').then(({ data }) => setBrands(data || []));
    supabase.from('categories').select('id, name').order('name').then(({ data }) => setCategories(data || []));
  }, []);

  const openNew = () => setEditing({ ...empty, variants: [{ size: 'M', color: 'Black', color_hex: '#000000', price: 0, stock: 0 }] });

  const openEdit = async (id: string) => {
    const { data: p } = await supabase.from('products').select('*').eq('id', id).single();
    const { data: v } = await supabase.from('product_variants').select('*').eq('product_id', id);
    if (!p) return;
    setEditing({
      id: p.id, name: p.name, slug: p.slug, description: p.description || '',
      brand_id: p.brand_id, category_id: p.category_id, material: p.material || '', care: p.care || '',
      is_active: p.is_active, is_featured: p.is_featured, images: p.images || [],
      variants: (v || []).map((x: any) => ({ id: x.id, size: x.size || '', color: x.color || '', color_hex: x.color_hex || '#000000', price: Number(x.price), compare_price: x.compare_price ? Number(x.compare_price) : null, stock: x.stock, sku: x.sku || '' })),
    });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await supabase.from('product_variants').delete().eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const uploadImage = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'vault26/products');
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setEditing((prev) => prev ? { ...prev, images: [...prev.images, data.secure_url] } : prev);
    } catch (e: any) {
      toast.error(e.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name || !editing.slug) return toast.error('Name and slug required');
    if (editing.variants.length === 0) return toast.error('Add at least one variant');
    setSaving(true);
    try {
      const payload = {
        name: editing.name, slug: editing.slug, description: editing.description,
        brand_id: editing.brand_id, category_id: editing.category_id,
        material: editing.material, care: editing.care,
        is_active: editing.is_active, is_featured: editing.is_featured,
        images: editing.images,
      };
      let productId = editing.id;
      if (productId) {
        const { error } = await supabase.from('products').update(payload).eq('id', productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;
        productId = data.id;
      }
      // Replace variants: delete then insert
      await supabase.from('product_variants').delete().eq('product_id', productId!);
      const variantsPayload = editing.variants.map((v) => ({
        product_id: productId!, size: v.size, color: v.color, color_hex: v.color_hex,
        price: v.price, compare_price: v.compare_price || null, stock: v.stock, sku: v.sku || null,
      }));
      const { error: vErr } = await supabase.from('product_variants').insert(variantsPayload);
      if (vErr) throw vErr;
      toast.success('Saved');
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter((p) => {
    if (activeCategory !== 'ALL' && p.category_id !== activeCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="font-display text-2xl md:text-3xl">Products <span className="text-muted-foreground text-sm font-sans">({filtered.length})</span></h1>
        <div className="flex items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="border border-border bg-transparent px-3 py-2 text-sm w-40 sm:w-56" />
          <button onClick={openNew} className="bg-foreground text-background px-3 sm:px-4 py-2 text-xs uppercase tracking-widest flex items-center gap-2"><Plus className="h-4 w-4" /> New</button>
        </div>
      </div>

      {/* Category chips */}
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
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-secondary"><tr>{['','Name','Brand','Category','Price from','Stock','Active',''].map((h, i) => <th key={i} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((p) => {
              const minP = p.product_variants.length ? Math.min(...p.product_variants.map((v: any) => Number(v.price))) : 0;
              const stock = p.product_variants.reduce((s: number, v: any) => s + v.stock, 0);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3"><img src={p.images?.[0]} alt="" className="w-10 h-12 object-cover" /></td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-muted-foreground">{p.brands?.name || '—'}</td>
                  <td className="p-3 text-muted-foreground">{p.categories?.name || '—'}</td>
                  <td className="p-3">{inr(minP)}</td>
                  <td className="p-3">{stock}</td>
                  <td className="p-3 text-xs">{p.is_active ? '✓' : '—'}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(p.id)} className="p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(p.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">No products in this view.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setEditing(null)}>
          <div className="w-full sm:max-w-2xl bg-background h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-background z-10">
              <h2 className="font-display text-2xl">{editing.id ? 'Edit product' : 'New product'}</h2>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} className={inputCls} /></Field>
                <Field label="Slug"><input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className={inputCls} /></Field>
                <Field label="Brand">
                  <select value={editing.brand_id || ''} onChange={(e) => setEditing({ ...editing, brand_id: e.target.value || null })} className={inputCls}>
                    <option value="">—</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </Field>
                <Field label="Category">
                  <select value={editing.category_id || ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })} className={inputCls}>
                    <option value="">—</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description"><textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={4} className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Material"><input value={editing.material} onChange={(e) => setEditing({ ...editing, material: e.target.value })} className={inputCls} /></Field>
                <Field label="Care"><input value={editing.care} onChange={(e) => setEditing({ ...editing, care: e.target.value })} className={inputCls} /></Field>
              </div>
              <div className="flex gap-6 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> Featured</label>
              </div>

              <div>
                <div className="eyebrow mb-2">Images</div>
                <div className="flex gap-2 flex-wrap">
                  {editing.images.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-20 h-24 object-cover" />
                      <button onClick={() => setEditing({ ...editing, images: editing.images.filter((_, j) => j !== i) })} className="absolute -top-2 -right-2 bg-foreground text-background rounded-full p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <label className={`w-20 h-24 border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-secondary gap-1 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload className="h-4 w-4" />
                    {uploading && <span className="text-[9px] uppercase tracking-widest">Uploading…</span>}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { Array.from(e.target.files || []).forEach(uploadImage); e.target.value = ''; }} />
                  </label>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="eyebrow">Variants</div>
                  <button onClick={() => setEditing({ ...editing, variants: [...editing.variants, { size: '', color: '', color_hex: '#000000', price: 0, stock: 0 }] })} className="text-xs uppercase tracking-widest">+ Add</button>
                </div>
                <div className="space-y-4">
                  {editing.variants.map((v, i) => (
                    <div key={i} className="border border-border p-4 space-y-3 relative group">
                      <button onClick={() => setEditing({ ...editing, variants: editing.variants.filter((_, j) => j !== i) })} className="absolute top-2 right-2 text-destructive p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></button>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Size"><input placeholder="Size" value={v.size} onChange={(e) => updateVariant(editing, setEditing, i, { size: e.target.value })} className={inputCls} /></Field>
                        <Field label="Color"><input placeholder="Color" value={v.color} onChange={(e) => updateVariant(editing, setEditing, i, { color: e.target.value })} className={inputCls} /></Field>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Hex"><input type="color" value={v.color_hex} onChange={(e) => updateVariant(editing, setEditing, i, { color_hex: e.target.value })} className="h-10 w-full border border-border" /></Field>
                        <Field label="Stock"><input type="number" placeholder="Stock" value={v.stock} onChange={(e) => updateVariant(editing, setEditing, i, { stock: Number(e.target.value) })} className={inputCls} /></Field>
                        <Field label="Delete"><button onClick={() => setEditing({ ...editing, variants: editing.variants.filter((_, j) => j !== i) })} className="w-full h-10 flex items-center justify-center border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors rounded"><Trash2 className="h-4 w-4" /></button></Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Price"><input type="number" placeholder="Price" value={v.price} onChange={(e) => updateVariant(editing, setEditing, i, { price: Number(e.target.value) })} className={inputCls} /></Field>
                        <Field label="Compare"><input type="number" placeholder="Compare" value={v.compare_price ?? ''} onChange={(e) => updateVariant(editing, setEditing, i, { compare_price: e.target.value ? Number(e.target.value) : null })} className={inputCls} /></Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button onClick={() => setEditing(null)} className="flex-1 border border-border py-3 text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 bg-foreground text-background py-3 text-xs uppercase tracking-widest disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs uppercase tracking-widest text-muted-foreground">{label}<div className="mt-1.5">{children}</div></label>;
}

function updateVariant(editing: ProductForm, setEditing: (p: ProductForm) => void, i: number, patch: Partial<Variant>) {
  const variants = [...editing.variants];
  variants[i] = { ...variants[i], ...patch };
  setEditing({ ...editing, variants });
}
