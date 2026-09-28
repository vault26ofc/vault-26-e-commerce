import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Link2, Upload, X } from 'lucide-react';
import { useCloudinaryUpload } from '@/lib/useCloudinaryUpload';
import { isVideoUrl, moveItem } from '@/lib/media';

type Kind = 'image' | 'video' | 'any';

const ACCEPT: Record<Kind, string> = { image: 'image/*', video: 'video/*', any: 'image/*,video/*' };

export function MediaPreview({ url, className = 'w-20 h-24' }: { url: string; className?: string }) {
  if (!url) return null;
  return isVideoUrl(url)
    ? <video src={url} className={`${className} object-cover bg-secondary`} muted playsInline loop autoPlay />
    : <img src={url} alt="" className={`${className} object-cover bg-secondary`} />;
}

/** Uploads a file to Cloudinary (image or video by its type) and returns the URL. */
function useMediaUpload(folder: string) {
  const { upload, progress } = useCloudinaryUpload();
  const [busy, setBusy] = useState(false);
  const run = async (file: File): Promise<string | null> => {
    setBusy(true);
    try {
      const { secureUrl } = await upload(file, { folder, resourceType: file.type.startsWith('video/') ? 'video' : 'image' });
      return secureUrl;
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, progress };
}

/** One image/video: upload a file or paste a URL. */
export function MediaField({ label, value, onChange, kind = 'any', folder = 'vault26/cms' }: {
  label?: string; value: string | null | undefined; onChange: (url: string) => void; kind?: Kind; folder?: string;
}) {
  const { run, busy, progress } = useMediaUpload(folder);
  const url = value || '';
  return (
    <div className="space-y-2">
      {label && <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>}
      <div className="flex gap-3 items-start">
        {url
          ? <div className="relative shrink-0"><MediaPreview url={url} />
              <button type="button" onClick={() => onChange('')} className="absolute -top-2 -right-2 bg-foreground text-background p-0.5" aria-label="Remove"><X className="h-3 w-3" /></button>
            </div>
          : <div className="w-20 h-24 border border-dashed border-border shrink-0" />}
        <div className="flex-1 space-y-2 min-w-0">
          <label className={`inline-flex items-center gap-2 border border-border px-3 py-2 text-xs uppercase tracking-widest cursor-pointer hover:bg-secondary ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="h-3.5 w-3.5" /> {busy ? `Uploading ${progress}%` : `Upload ${kind === 'any' ? 'image / video' : kind}`}
            <input type="file" accept={ACCEPT[kind]} className="hidden"
              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { const u = await run(f); if (u) onChange(u); } }} />
          </label>
          <div className="flex items-center gap-2 border border-border px-2">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input value={url} onChange={(e) => onChange(e.target.value.trim())} placeholder="…or paste an image / video URL"
              className="w-full bg-transparent py-2 text-sm outline-none min-w-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** An ordered list of images/videos: upload several, add by URL, reorder, remove. */
export function MediaListField({ label, value, onChange, kind = 'any', folder = 'vault26/cms' }: {
  label?: string; value: string[]; onChange: (urls: string[]) => void; kind?: Kind; folder?: string;
}) {
  const { run, busy, progress } = useMediaUpload(folder);
  const [draft, setDraft] = useState('');
  const list = value || [];
  const addUrl = () => {
    const u = draft.trim();
    if (!/^https?:\/\//.test(u)) return toast.error('Paste a full https:// URL');
    onChange([...list, u]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      {label && <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>}
      <div className="flex flex-wrap gap-3">
        {list.map((u, i) => (
          <div key={`${u}-${i}`} className="relative group">
            <MediaPreview url={u} />
            {i === 0 && <span className="absolute bottom-0 left-0 bg-foreground text-background text-[9px] px-1 uppercase tracking-widest">Cover</span>}
            <div className="absolute -top-2 -right-2 flex flex-col gap-0.5">
              <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="bg-foreground text-background p-0.5" aria-label="Remove"><X className="h-3 w-3" /></button>
              <button type="button" onClick={() => onChange(moveItem(list, i, -1))} className="bg-background border border-border p-0.5" aria-label="Move earlier"><ChevronUp className="h-3 w-3" /></button>
              <button type="button" onClick={() => onChange(moveItem(list, i, 1))} className="bg-background border border-border p-0.5" aria-label="Move later"><ChevronDown className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
        <label className={`w-20 h-24 border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-secondary gap-1 text-center ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="h-4 w-4" />
          <span className="text-[9px] uppercase tracking-widest">{busy ? `${progress}%` : 'Upload'}</span>
          <input type="file" accept={ACCEPT[kind]} multiple className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files || []); e.target.value = '';
              const urls: string[] = [];
              for (const f of files) { const u = await run(f); if (u) urls.push(u); }
              if (urls.length) onChange([...list, ...urls]);
            }} />
        </label>
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
          placeholder="Paste an image / video URL" className="flex-1 border border-border bg-transparent px-3 py-2 text-sm min-w-0" />
        <button type="button" onClick={addUrl} className="border border-border px-3 text-xs uppercase tracking-widest hover:bg-secondary">Add</button>
      </div>
    </div>
  );
}
