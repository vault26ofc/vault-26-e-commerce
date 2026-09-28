import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';
import { SearchSelect } from '@/components/admin/SearchSelect';
import { describeError } from '@/lib/errors';

type Category = { id: string; name: string };
type Size = { id: string; category_id: string; label: string; position: number };

const PRESETS: { name: string; labels: string[] }[] = [
  { name: 'Clothing', labels: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { name: 'Waist', labels: ['28', '30', '32', '34', '36', '38', '40'] },
  { name: 'Shoes (UK)', labels: ['6', '7', '8', '9', '10', '11'] },
  { name: 'One size', labels: ['One Size'] },
];

export default function AdminSizes() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [sizes, setSizes] = useState<Size[]>([]);
  const [editing, setEditing] = useState<Partial<Size> | null>(null);
  const [saving, setSaving] = useState(false);
  const [quick, setQuick] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('categories').select('id, name').order('name').then(({ data }) => {
      setCategories(data || []);
      if (data && data.length && !activeCategoryId) setActiveCategoryId(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSizes = async (categoryId: string) => {
    const { data } = await supabase
      .from('sizes')
      .select('*')
      .eq('category_id', categoryId)
      .order('position');
    setSizes((data as unknown as Size[]) || []);
  };

  useEffect(() => {
    if (activeCategoryId) loadSizes(activeCategoryId);
  }, [activeCategoryId]);

  const save = async () => {
    const label = editing?.label?.trim();
    if (!label) return toast.error('Label required');
    const dup = sizes.some(
      (s) => s.label.toLowerCase() === label.toLowerCase() && s.id !== editing?.id
    );
    if (dup) return toast.error('That size already exists in this category');
    setSaving(true);
    if (editing?.id) {
      const { error } = await supabase.from('sizes').update({ label }).eq('id', editing.id);
      setSaving(false);
      if (error) return toast.error(describeError(error));
    } else {
      const maxPos = sizes.reduce((m, s) => Math.max(m, s.position), -1);
      const { error } = await supabase
        .from('sizes')
        .insert({ category_id: activeCategoryId, label, position: maxPos + 1 });
      setSaving(false);
      if (error) return toast.error(describeError(error));
    }
    toast.success('Saved');
    setEditing(null);
    loadSizes(activeCategoryId);
  };

  /** Adds several sizes at once, skipping ones the category already has. */
  const addMany = async (labels: string[]) => {
    const existing = new Set(sizes.map((s) => s.label.toLowerCase()));
    const fresh = [...new Set(labels.map((l) => l.trim()).filter(Boolean))].filter((l) => !existing.has(l.toLowerCase()));
    if (!fresh.length) return toast.info('Those sizes are already in this category');
    const start = sizes.reduce((m, s) => Math.max(m, s.position), -1) + 1;
    const { error } = await supabase.from('sizes').insert(fresh.map((label, i) => ({ category_id: activeCategoryId, label, position: start + i })));
    if (error) return toast.error(describeError(error));
    toast.success(`Added ${fresh.join(', ')}`);
    setQuick('');
    loadSizes(activeCategoryId);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this size?')) return;
    const { error } = await supabase.from('sizes').delete().eq('id', id);
    if (error) return toast.error(describeError(error));
    toast.success('Deleted');
    loadSizes(activeCategoryId);
  };

  const move = async (size: Size, dir: 'up' | 'down') => {
    const idx = sizes.findIndex((s) => s.id === size.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sizes.length) return;
    const swap = sizes[swapIdx];
    await Promise.all([
      supabase.from('sizes').update({ position: swap.position }).eq('id', size.id),
      supabase.from('sizes').update({ position: size.position }).eq('id', swap.id),
    ]);
    loadSizes(activeCategoryId);
  };

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Sizes</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Step 2 of the catalog flow: each category gets its own size list (shirts use S–XL, trousers use waist sizes…). The product editor offers exactly these sizes.
      </p>

      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <label className="block text-xs uppercase tracking-widest text-muted-foreground">Category
          <SearchSelect className="mt-1.5 w-64 normal-case tracking-normal text-foreground" value={activeCategoryId}
            onChange={(v) => { setActiveCategoryId(v); setSearch(''); }} placeholder="Search a category…"
            options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        </label>
        <label className="block text-xs uppercase tracking-widest text-muted-foreground">Search sizes
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. XL"
            className="mt-1.5 block w-48 border border-border bg-transparent px-3 py-2 text-sm normal-case tracking-normal text-foreground" />
        </label>
      </div>

      {activeCategoryId && (
        <div className="max-w-md mb-4 space-y-2">
          <div className="flex gap-2">
            <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Add several: S, M, L, XL"
              onKeyDown={(e) => { if (e.key === 'Enter') addMany(quick.split(',')); }}
              className="flex-1 border border-border bg-transparent px-3 py-2 text-sm" />
            <button onClick={() => addMany(quick.split(','))} className="bg-foreground text-background px-4 text-xs uppercase tracking-widest">Add</button>
          </div>
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-muted-foreground">Presets:</span>
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => addMany(p.labels)} title={p.labels.join(', ')} className="border border-border px-2 py-1 hover:bg-secondary">{p.name}</button>
            ))}
          </div>
        </div>
      )}

      <div className="border border-border max-w-md">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="eyebrow">Sizes</div>
          <button
            onClick={() => setEditing({ label: '' })}
            disabled={!activeCategoryId}
            className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {sizes.filter((s) => !search.trim() || s.label.toLowerCase().includes(search.trim().toLowerCase())).map((s, i) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-medium">{s.label}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => move(s, 'up')} disabled={i === 0 || !!search} className="p-1.5 hover:bg-secondary disabled:opacity-30">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(s, 'down')} disabled={i === sizes.length - 1 || !!search} className="p-1.5 hover:bg-secondary disabled:opacity-30">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditing(s)} className="p-1.5 hover:bg-secondary">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(s.id)} className="p-1.5 hover:bg-secondary text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!sizes.length && (
              <tr>
                <td className="p-6 text-center text-muted-foreground text-xs">
                  No sizes yet for this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl">{editing.id ? 'Edit' : 'New'} Size</h3>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Label
              <input
                value={editing.label || ''}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm"
                autoFocus
              />
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 border border-border py-3 text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-foreground text-background py-3 text-xs uppercase tracking-widest disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
