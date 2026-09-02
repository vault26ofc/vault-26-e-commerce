import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';

type Category = { id: string; name: string };
type Size = { id: string; category_id: string; label: string; position: number };

export default function AdminSizes() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [sizes, setSizes] = useState<Size[]>([]);
  const [editing, setEditing] = useState<Partial<Size> | null>(null);
  const [saving, setSaving] = useState(false);

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
    setSizes((data as Size[]) || []);
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
      if (error) return toast.error(error.message);
    } else {
      const maxPos = sizes.reduce((m, s) => Math.max(m, s.position), -1);
      const { error } = await supabase
        .from('sizes')
        .insert({ category_id: activeCategoryId, label, position: maxPos + 1 });
      setSaving(false);
      if (error) return toast.error(error.message);
    }
    toast.success('Saved');
    setEditing(null);
    loadSizes(activeCategoryId);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this size?')) return;
    const { error } = await supabase.from('sizes').delete().eq('id', id);
    if (error) return toast.error(error.message);
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
        Ordered size lists per category, used by the product editor's size picker.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategoryId(c.id)}
            className={`text-xs uppercase tracking-widest px-3 py-1.5 border ${
              activeCategoryId === c.id
                ? 'bg-foreground text-background border-foreground'
                : 'border-border hover:bg-secondary'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

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
            {sizes.map((s, i) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-medium">{s.label}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => move(s, 'up')} disabled={i === 0} className="p-1.5 hover:bg-secondary disabled:opacity-30">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(s, 'down')} disabled={i === sizes.length - 1} className="p-1.5 hover:bg-secondary disabled:opacity-30">
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
