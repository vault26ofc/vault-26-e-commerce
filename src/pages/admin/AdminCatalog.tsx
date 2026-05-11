import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

type Row = { id: string; name: string; slug: string; is_active: boolean; description?: string | null; logo?: string | null };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function CrudPanel({ table, title }: { table: 'brands' | 'categories'; title: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from(table).select('*').order('name');
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
    const { error } = editing.id
      ? await supabase.from(table).update(payload).eq('id', editing.id)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
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
        <button onClick={() => setEditing({ name: '', slug: '', is_active: true })} className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent"><Plus className="h-3 w-3" /> New</button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-secondary text-xs"><tr><th className="text-left p-3">Name</th><th className="text-left p-3">Slug</th><th className="text-left p-3">Active</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-3 font-medium">{r.name}</td>
              <td className="p-3 text-muted-foreground">{r.slug}</td>
              <td className="p-3 text-xs">{r.is_active ? '✓' : '—'}</td>
              <td className="p-3 text-right whitespace-nowrap">
                <button onClick={() => setEditing(r)} className="p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(r.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">No entries yet.</td></tr>}
        </tbody>
      </table>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
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
              <label className="block text-xs uppercase tracking-widest text-muted-foreground">Description
                <textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
              </label>
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
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">Manage the brands and categories used across the storefront. New brands and categories appear immediately in product editors and navigation filters.</p>
      <div className="grid lg:grid-cols-2 gap-6">
        <CrudPanel table="brands" title="Brands" />
        <CrudPanel table="categories" title="Categories" />
      </div>
    </div>
  );
}
