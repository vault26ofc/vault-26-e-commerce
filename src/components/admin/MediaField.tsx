import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Link2, Upload, X } from 'lucide-react';
import { useCloudinaryUpload } from '@/lib/useCloudinaryUpload';
import { isVideoUrl, moveItem } from '@/lib/media';
import { cn } from '@/lib/utils';

type Kind = 'image' | 'video' | 'any';
type MediaType = 'image' | 'video';

export function MediaPreview({ url, className = 'w-20 h-24' }: { url: string; className?: string }) {
  if (!url) return null;
  return isVideoUrl(url)
    ? <video src={url} className={`${className} object-cover bg-secondary`} muted playsInline loop autoPlay />
    : <img src={url} alt="" className={`${className} object-cover bg-secondary`} />;
}

/** Segmented control in the admin's black/outline style. */
function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex border border-border">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cn('px-3 py-1.5 text-[11px] uppercase tracking-widest inline-flex items-center gap-1.5',
            value === o.value ? 'bg-foreground text-background' : 'hover:bg-secondary')}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

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

/**
 * The one media control used everywhere in the admin:
 *   [IMAGE | VIDEO]  [URL | UPLOAD]
 *   <paste box>  or  <drop / choose file>
 * `onAdd` mode (lists) clears itself after each add; otherwise it edits `value`.
 */
function MediaInput({ kind, folder, current, onPick, busy, progress, run }: {
  kind: Kind; folder: string; current?: string; onPick: (url: string) => void;
  busy: boolean; progress: number; run: (f: File) => Promise<string | null>;
}) {
  const [type, setType] = useState<MediaType>(kind === 'video' || (kind === 'any' && isVideoUrl(current)) ? 'video' : 'image');
  const [source, setSource] = useState<'url' | 'upload'>('url');
  const [draft, setDraft] = useState('');
  void folder;
  const commitUrl = () => {
    const u = draft.trim();
    if (!/^https?:\/\//.test(u) && !u.startsWith('/')) return toast.error('Paste a full https:// link');
    onPick(u);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {kind === 'any' && (
          <Segmented<MediaType> value={type} onChange={setType} options={[{ value: 'image', label: 'Image' }, { value: 'video', label: 'Video' }]} />
        )}
        <Segmented<'url' | 'upload'> value={source} onChange={setSource} options={[
          { value: 'url', label: 'URL', icon: <Link2 className="h-3 w-3" /> },
          { value: 'upload', label: 'Upload', icon: <Upload className="h-3 w-3" /> },
        ]} />
      </div>
      {source === 'url' ? (
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitUrl(); } }}
          onBlur={() => { if (draft.trim()) commitUrl(); }}
          placeholder={`Paste ${type === 'video' ? 'a video' : 'an image'} URL…`}
          className="w-full border border-border bg-transparent px-3 py-2.5 text-sm" />
      ) : (
        <label className={cn('flex items-center justify-center gap-2 border border-dashed border-border py-5 text-[11px] uppercase tracking-widest cursor-pointer hover:bg-secondary',
          busy && 'opacity-50 pointer-events-none')}>
          <Upload className="h-4 w-4" /> {busy ? `Uploading ${progress}%` : `Choose ${type === 'video' ? 'a video' : 'an image'}`}
          <input type="file" accept={type === 'video' ? 'video/*' : 'image/*'} className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { const u = await run(f); if (u) onPick(u); } }} />
        </label>
      )}
    </div>
  );
}

/** One image/video. */
export function MediaField({ label, value, onChange, kind = 'any', folder = 'vault26/cms' }: {
  label?: string; value: string | null | undefined; onChange: (url: string) => void; kind?: Kind; folder?: string;
}) {
  const { run, busy, progress } = useMediaUpload(folder);
  const url = value || '';
  return (
    <div className="space-y-2">
      {label && <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>}
      {url && (
        <div className="flex items-start gap-3">
          <MediaPreview url={url} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-xs text-muted-foreground break-all line-clamp-2">{url}</div>
            <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-destructive">
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      )}
      <MediaInput kind={kind} folder={folder} current={url} onPick={onChange} busy={busy} progress={progress} run={run} />
    </div>
  );
}

/** An ordered list of images/videos. */
export function MediaListField({ label, value, onChange, kind = 'any', folder = 'vault26/cms' }: {
  label?: string; value: string[]; onChange: (urls: string[]) => void; kind?: Kind; folder?: string;
}) {
  const { run, busy, progress } = useMediaUpload(folder);
  const list = value || [];
  return (
    <div className="space-y-2">
      {label && <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>}
      {list.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {list.map((u, i) => (
            <div key={`${u}-${i}`} className="relative">
              <MediaPreview url={u} />
              {i === 0 && <span className="absolute bottom-0 left-0 bg-foreground text-background text-[9px] px-1 uppercase tracking-widest">Cover</span>}
              <div className="absolute -top-2 -right-2 flex flex-col gap-0.5">
                <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="bg-foreground text-background p-0.5" aria-label="Remove"><X className="h-3 w-3" /></button>
                <button type="button" onClick={() => onChange(moveItem(list, i, -1))} className="bg-background border border-border p-0.5" aria-label="Move earlier"><ChevronUp className="h-3 w-3" /></button>
                <button type="button" onClick={() => onChange(moveItem(list, i, 1))} className="bg-background border border-border p-0.5" aria-label="Move later"><ChevronDown className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <MediaInput kind={kind} folder={folder} onPick={(u) => onChange([...list, u])} busy={busy} progress={progress} run={run} />
    </div>
  );
}
