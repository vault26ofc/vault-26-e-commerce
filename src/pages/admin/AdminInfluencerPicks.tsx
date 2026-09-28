import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react';
import { useCloudinaryUpload } from '@/lib/useCloudinaryUpload';
import { MediaField } from '@/components/admin/MediaField';
import { ProductPicker } from '@/components/admin/Pickers';
import { isVideoUrl } from '@/lib/media';

type Pick = {
  id: string;
  name: string;
  handle: string | null;
  video_source: 'upload' | 'link';
  video_url: string | null;
  link_url: string | null;
  thumbnail_url: string | null;
  thumbnail_type: 'image' | 'video';
  quote: string | null;
  is_active: boolean;
  position: number;
};
type Product = { slug: string; name: string };
type PickProduct = { id: string; influencer_pick_id: string; product_slug: string };

export default function AdminInfluencerPicks() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pickProducts, setPickProducts] = useState<PickProduct[]>([]);
  const [editing, setEditing] = useState<Partial<Pick> | null>(null);
  const [saving, setSaving] = useState(false);
  const { upload, uploading } = useCloudinaryUpload();

  const load = async () => {
    const [{ data: p }, { data: pp }] = await Promise.all([
      supabase.from('influencer_picks' as any).select('*').order('position'),
      supabase.from('influencer_pick_products' as any).select('*'),
    ]);
    setPicks((p as unknown as Pick[]) || []);
    setPickProducts((pp as unknown as PickProduct[]) || []);
  };

  useEffect(() => {
    load();
    supabase.from('products').select('slug, name').eq('is_active', true).order('name').then(({ data }) => setProducts(data || []));
  }, []);

  const save = async () => {
    if (!editing?.name) return toast.error('Name required');
    if (editing.video_source === 'upload' && !editing.video_url) return toast.error('Upload a video first');
    if (editing.video_source === 'link' && !editing.link_url) return toast.error('Link URL required');
    setSaving(true);
    const payload = {
      name: editing.name,
      handle: editing.handle || null,
      video_source: editing.video_source || 'link',
      video_url: editing.video_source === 'upload' ? editing.video_url : null,
      link_url: editing.video_source === 'link' ? editing.link_url : null,
      thumbnail_url: editing.thumbnail_url || null,
      thumbnail_type: editing.thumbnail_type || 'image',
      quote: editing.quote || null,
      is_active: editing.is_active ?? true,
    };
    if (editing.id) {
      const { error } = await supabase.from('influencer_picks' as any).update(payload).eq('id', editing.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success('Saved');
      load();
    } else {
      const { data, error } = await supabase.from('influencer_picks' as any).insert({ ...payload, position: picks.length }).select().single();
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success('Saved — now tag products below');
      setEditing({ ...editing, id: (data as any).id }); // keep modal open for product tagging
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this pick?')) return;
    const { error } = await supabase.from('influencer_picks' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const taggedFor = (pickId: string) => pickProducts.filter((pp) => pp.influencer_pick_id === pickId);

  const addProductTag = async (pickId: string, slug: string) => {
    const { error } = await supabase.from('influencer_pick_products' as any).insert({ influencer_pick_id: pickId, product_slug: slug, position: taggedFor(pickId).length });
    if (error) return toast.error(error.message);
    load();
  };

  const removeProductTag = async (id: string) => {
    const { error } = await supabase.from('influencer_pick_products' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const handleThumbnail = async (file: File) => {
    try {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const { secureUrl } = await upload(file, { resourceType: type, folder: 'vault26/influencer' });
      setEditing((prev) => ({ ...prev, thumbnail_url: secureUrl, thumbnail_type: type }));
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
  };

  const handleVideo = async (file: File) => {
    try {
      const { secureUrl } = await upload(file, { resourceType: 'video', folder: 'vault26/influencer' });
      setEditing((prev) => ({ ...prev, video_url: secureUrl }));
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Influencer Picks</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Creator style picks shown on the homepage — upload a video or link to a reel, then tag the products featured.
      </p>

      <div className="border border-border">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="eyebrow">Picks</div>
          <button onClick={() => setEditing({ video_source: 'link', thumbnail_type: 'image', is_active: true })} className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {picks.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-muted-foreground">{p.handle}</td>
                <td className="p-3 text-xs uppercase">{p.video_source}</td>
                <td className="p-3 text-xs">{taggedFor(p.id).length} product(s)</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => setEditing(p)} className="p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(p.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {!picks.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">No picks yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="bg-background w-full max-w-lg p-6 space-y-4 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl">{editing.id ? 'Edit' : 'New'} Pick</h3>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>

            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Name
              <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" autoFocus />
            </label>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Handle
              <input value={editing.handle || ''} onChange={(e) => setEditing({ ...editing, handle: e.target.value })} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" placeholder="@handle" />
            </label>

            <div className="flex gap-2">
              <button onClick={() => setEditing({ ...editing, video_source: 'upload' })} className={`flex-1 border py-2 text-xs uppercase tracking-widest ${editing.video_source === 'upload' ? 'bg-foreground text-background border-foreground' : 'border-border'}`}>Upload video</button>
              <button onClick={() => setEditing({ ...editing, video_source: 'link' })} className={`flex-1 border py-2 text-xs uppercase tracking-widest ${editing.video_source === 'link' ? 'bg-foreground text-background border-foreground' : 'border-border'}`}>Link out</button>
            </div>

            {editing.video_source === 'upload' ? (
              <MediaField label="Video" kind="video" folder="vault26/influencers" value={editing.video_url} onChange={(url) => setEditing({ ...editing, video_url: url })} />
            ) : (
              <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                Link URL
                <input value={editing.link_url || ''} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" placeholder="https://instagram.com/reel/..." />
              </label>
            )}

            <MediaField label="Thumbnail (image or video)" kind="any" folder="vault26/influencers" value={editing.thumbnail_url}
              onChange={(url) => setEditing({ ...editing, thumbnail_url: url, thumbnail_type: isVideoUrl(url) ? 'video' : 'image' })} />

            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Quote
              <textarea value={editing.quote || ''} onChange={(e) => setEditing({ ...editing, quote: e.target.value })} rows={2} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
            </label>

            {editing.id && (
              <div className="border-t border-border pt-4">
                <div className="eyebrow mb-2">Tagged products</div>
                <ProductPicker
                  value={taggedFor(editing.id).map((pp) => pp.product_slug)}
                  onChange={(next) => {
                    const current = taggedFor(editing!.id!);
                    next.filter((slug) => !current.some((pp) => pp.product_slug === slug)).forEach((slug) => addProductTag(editing!.id!, slug));
                    current.filter((pp) => !next.includes(pp.product_slug)).forEach((pp) => removeProductTag(pp.id));
                  }}
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 border border-border py-3 text-xs uppercase tracking-widest">Close</button>
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
