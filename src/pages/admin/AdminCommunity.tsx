import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useCloudinaryUpload } from '@/lib/useCloudinaryUpload';

type Photo = {
  id: string;
  image_url: string;
  media_type: 'image' | 'video';
  handle: string | null;
  bento_size: 'sm' | 'md' | 'lg' | 'wide' | 'tall';
  is_active: boolean;
  position: number;
};

const SIZES: Photo['bento_size'][] = ['sm', 'md', 'lg', 'wide', 'tall'];

export default function AdminCommunity() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const { upload, uploading } = useCloudinaryUpload();

  const load = async () => {
    const { data } = await supabase.from('community_photos' as any).select('*').order('position');
    setPhotos((data as unknown as Photo[]) || []);
  };

  useEffect(() => { load(); }, []);

  const addBlank = async () => {
    const { error } = await supabase.from('community_photos' as any).insert({
      image_url: '', handle: '', bento_size: 'md', position: photos.length,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const patch = async (id: string, fields: Partial<Photo>) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields } : p)));
    const { error } = await supabase.from('community_photos' as any).update(fields).eq('id', id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this photo?')) return;
    const { error } = await supabase.from('community_photos' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const handleFile = async (id: string, file: File) => {
    try {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const { secureUrl } = await upload(file, { resourceType: mediaType, folder: 'vault26/community' });
      patch(id, { image_url: secureUrl, media_type: mediaType });
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl md:text-3xl">Community</h1>
        <button onClick={addBlank} className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent">
          <Plus className="h-3 w-3" /> New
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Photos/videos shown in the homepage "Worn By Vault 26" bento grid. Every field saves
        immediately as you change it.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((p) => (
          <div key={p.id} className="border border-border p-4 space-y-3">
            <label className="border border-dashed border-border flex items-center justify-center h-40 cursor-pointer relative overflow-hidden">
              {p.image_url ? (
                p.media_type === 'video' ? (
                  <video src={p.image_url} className="w-full h-full object-cover" />
                ) : (
                  <img src={p.image_url} className="w-full h-full object-cover" alt="" />
                )
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(p.id, f); }} />
            </label>
            <input
              placeholder="@handle"
              value={p.handle || ''}
              onChange={(e) => patch(p.id, { handle: e.target.value })}
              className="w-full border border-border bg-transparent px-3 py-2 text-sm"
            />
            <select
              value={p.bento_size}
              onChange={(e) => patch(p.id, { bento_size: e.target.value as Photo['bento_size'] })}
              className="w-full border border-border bg-transparent px-3 py-2 text-sm"
            >
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={p.is_active} onChange={(e) => patch(p.id, { is_active: e.target.checked })} /> Active
              </label>
              <button onClick={() => remove(p.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {!photos.length && <p className="text-sm text-muted-foreground">No photos yet — click New to add one.</p>}
    </div>
  );
}
