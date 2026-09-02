import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, Upload } from 'lucide-react';
import { useCloudinaryUpload } from '@/lib/useCloudinaryUpload';

type Slide = {
  id: string;
  image_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  product_slug: string | null;
  is_active: boolean;
  position: number;
};
type Product = { slug: string; name: string };

export default function AdminLookbook() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<Slide> | null>(null);
  const [saving, setSaving] = useState(false);
  const { upload, uploading } = useCloudinaryUpload();

  const load = async () => {
    const { data } = await supabase.from('lookbook_slides' as any).select('*').order('position');
    setSlides((data as unknown as Slide[]) || []);
  };

  useEffect(() => {
    load();
    supabase.from('products').select('slug, name').eq('is_active', true).order('name').then(({ data }) => setProducts(data || []));
  }, []);

  const save = async () => {
    if (!editing?.image_url) return toast.error('Media is required');
    if (!editing?.product_slug) return toast.error('Linked product is required');
    setSaving(true);
    const payload = {
      image_url: editing.image_url,
      media_type: editing.media_type || 'image',
      caption: editing.caption || null,
      product_slug: editing.product_slug,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from('lookbook_slides' as any).update(payload).eq('id', editing.id)
      : await supabase.from('lookbook_slides' as any).insert({ ...payload, position: slides.length });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this slide?')) return;
    const { error } = await supabase.from('lookbook_slides' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const move = async (slide: Slide, dir: 'up' | 'down') => {
    const idx = slides.findIndex((s) => s.id === slide.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= slides.length) return;
    const swap = slides[swapIdx];
    await Promise.all([
      supabase.from('lookbook_slides' as any).update({ position: swap.position }).eq('id', slide.id),
      supabase.from('lookbook_slides' as any).update({ position: slide.position }).eq('id', swap.id),
    ]);
    load();
  };

  const handleFile = async (file: File) => {
    try {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const { secureUrl } = await upload(file, { resourceType: mediaType, folder: 'vault26/lookbook' });
      setEditing((prev) => ({ ...prev, image_url: secureUrl, media_type: mediaType }));
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Lookbook</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Photo/video slides shown on the homepage lookbook section and the full /lookbook page.
      </p>

      <div className="border border-border max-w-2xl">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="eyebrow">Slides</div>
          <button onClick={() => setEditing({ media_type: 'image', is_active: true })} className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {slides.map((s, i) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3">
                  {s.media_type === 'video' ? (
                    <video src={s.image_url} className="h-14 w-14 object-cover" />
                  ) : (
                    <img src={s.image_url} className="h-14 w-14 object-cover" alt="" />
                  )}
                </td>
                <td className="p-3 text-muted-foreground">{s.product_slug}</td>
                <td className="p-3 text-xs">{s.is_active ? 'Active' : 'Hidden'}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => move(s, 'up')} disabled={i === 0} className="p-1.5 hover:bg-secondary disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => move(s, 'down')} disabled={i === slides.length - 1} className="p-1.5 hover:bg-secondary disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  <button onClick={() => setEditing(s)} className="p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(s.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {!slides.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">No slides yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl">{editing.id ? 'Edit' : 'New'} Slide</h3>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>

            <label className="border border-dashed border-border flex flex-col items-center justify-center gap-2 p-6 cursor-pointer text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
              {editing.image_url ? (
                editing.media_type === 'video' ? (
                  <video src={editing.image_url} className="h-24 object-cover" />
                ) : (
                  <img src={editing.image_url} className="h-24 object-cover" alt="" />
                )
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {uploading ? 'Uploading…' : 'Upload image or video'}
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>

            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Linked product
              <select
                value={editing.product_slug || ''}
                onChange={(e) => setEditing({ ...editing, product_slug: e.target.value })}
                className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm"
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Caption
              <textarea
                value={editing.caption || ''}
                onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                rows={2}
                className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
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
