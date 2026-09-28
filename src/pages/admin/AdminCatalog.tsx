import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { MediaField, MediaPreview } from '@/components/admin/MediaField';
import { MultiSearchSelect } from '@/components/admin/SearchSelect';

type Row = { id: string; name: string; slug: string; is_active: boolean; description?: string | null; logo?: string | null; image?: string | null; video?: string | null; position?: number };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function CrudPanel({ table, title }: { table: 'brands' | 'categories'; title: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [saving, setSaving] = useState(false);
  // Brands: which categories each brand belongs to.
  const [allCats, setAllCats] = useState<{ id: string; name: string }[]>([]);
  const [links, setLinks] = useState<Record<string, string[]>>({});
  const [pickedCats, setPickedCats] = useState<string[]>([]);

  const loadLinks = async () => {
    if (table !== 'brands') return;
    const [{ data: cats }, { data: bc }] = await Promise.all([
      supabase.from('categories').select('id, name').order('position').order('name'),
      supabase.from('brand_categories').select('brand_id, category_id'),
    ]);
    setAllCats(cats || []);
    const m: Record<string, string[]> = {};
    (bc || []).forEach((x) => { (m[x.brand_id] ||= []).push(x.category_id); });
    setLinks(m);
  };

  const openEditor = (r: Partial<Row>) => { setEditing(r); setPickedCats(r.id ? links[r.id] || [] : []); };

  const load = async () => {
    loadLinks();
    const q = supabase.from(table).select('*');
    const { data } = table === 'categories' ? await q.order('position').order('name') : await q.order('name');
    setRows((data as any) || []);
  };
  useEffect(() => { load(); }, [table]);

  const save = async () => {
    if (!editing?.name) return toast.error('Name required');
    setSaving(true);
    const payload: any = {
      name: editing.name,
      slug: editing.slug || slugify(editing.name),
      is_active: editing.is_active ?? true,
    };
    if (table === 'brands') payload.description = editing.description || null;
    if (table === 'categories') {
      payload.description = editing.description || null;
      payload.image = editing.image || null;
      payload.video = editing.video || null;
      payload.position = Number(editing.position) || 0;
    }
    const { data: savedRow, error } = editing.id
      ? await supabase.from(table).update(payload).eq('id', editing.id).select('id').single()
      : await supabase.from(table).insert(payload).select('id').single();
    if (!error && table === 'brands' && savedRow) {
      // Replace this brand's categories with the ticked ones.
      await supabase.from('brand_categories').delete().eq('brand_id', savedRow.id);
      if (pickedCats.length) {
        const { error: e2 } = await supabase.from('brand_categories').insert(pickedCats.map((category_id) => ({ brand_id: savedRow.id, category_id })));
        if (e2) { setSaving(false); return toast.error(e2.message); }
      }
    }
    setSaving(false);
    if (error) return toast.error(error.message.includes('duplicate') ? 'That name or slug is already used' : error.message);
    toast.success('Saved'); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm(`Delete this ${title.toLowerCase()}?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  return (
    <div className="border border-border">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="eyebrow">{title}</div>
        <button onClick={() => openEditor({ name: '', slug: '', is_active: true })} className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent"><Plus className="h-3 w-3" /> New</button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-secondary text-xs"><tr>{table === 'categories' && <th className="p-3 w-14"></th>}<th className="text-left p-3">Name</th><th className="text-left p-3">{table === 'brands' ? 'Categories' : 'Slug'}</th><th className="text-left p-3">Active</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              {table === 'categories' && <td className="p-2">{(r.image || r.video) ? <MediaPreview url={(r.image || r.video)!} className="w-10 h-12" /> : <div className="w-10 h-12 bg-secondary" />}</td>}
              <td className="p-3 font-medium">{r.name}</td>
              <td className="p-3 text-muted-foreground">
                {table === 'brands'
                  ? ((links[r.id] || []).map((id) => allCats.find((c) => c.id === id)?.name).filter(Boolean).join(', ') || <span className="text-amber-700">No categories</span>)
                  : r.slug}
              </td>
              <td className="p-3 text-xs">{r.is_active ? '✓' : '—'}</td>
              <td className="p-3 text-right whitespace-nowrap">
                <button onClick={() => openEditor(r)} className="p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(r.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={table === 'categories' ? 5 : 4} className="p-6 text-center text-muted-foreground text-xs">No entries yet.</td></tr>}
        </tbody>
      </table>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl">{editing.id ? 'Edit' : 'New'} {title.slice(0, -1)}</h3>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">Name
              <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" autoFocus />
            </label>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">Slug
              <input value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
            </label>
            {table === 'brands' && (
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Categories this brand sells in</div>
                <MultiSearchSelect values={pickedCats} onChange={setPickedCats} placeholder="Search categories to add…"
                  options={allCats.map((c) => ({ value: c.id, label: c.name }))} />
              </div>
            )}
            {(table === 'brands' || table === 'categories') && (
              <label className="block text-xs uppercase tracking-widest text-muted-foreground">Description
                <textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
              </label>
            )}
            {table === 'categories' && (
              <>
                <MediaField label="Category image" kind="image" folder="vault26/categories" value={editing.image} onChange={(image) => setEditing({ ...editing, image })} />
                <MediaField label="Category video (optional, plays instead of the image where supported)" kind="video" folder="vault26/categories" value={editing.video} onChange={(video) => setEditing({ ...editing, video })} />
                <label className="block text-xs uppercase tracking-widest text-muted-foreground">Display order (lower first)
                  <input type="number" value={editing.position ?? 0} onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
                </label>
              </>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 border border-border py-3 text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-foreground text-background py-3 text-xs uppercase tracking-widest disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCatalog() {
  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-6">Catalog</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">Step 1 of the catalog flow: create categories here, then set each category's sizes in <a href="/admin/sizes" className="underline">Sizes</a>, then add products in <a href="/admin/products" className="underline">Products</a>.</p>
      <div className="grid lg:grid-cols-2 gap-6">
        <CrudPanel table="brands" title="Brands" />
        <CrudPanel table="categories" title="Categories" />
      </div>
    </div>
  );
}
