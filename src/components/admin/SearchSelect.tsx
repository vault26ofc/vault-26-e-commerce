import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SearchOption = { value: string; label: string; group?: string; hint?: string };

/** Case-insensitive match on label, group or hint. Exported for tests. */
export function filterOptions(options: SearchOption[], q: string): SearchOption[] {
  const s = q.trim().toLowerCase();
  if (!s) return options;
  return options.filter((o) => [o.label, o.group, o.hint].some((x) => x?.toLowerCase().includes(s)));
}

/**
 * The admin's dropdown: a search box first, then the matching options.
 * Type to filter, ↑/↓ to move, Enter to pick, Esc to close.
 */
export function SearchSelect({ value, onChange, options, placeholder = 'Choose…', emptyLabel, className, disabled }: {
  value: string; onChange: (v: string) => void; options: SearchOption[];
  placeholder?: string; emptyLabel?: string; className?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const list = useMemo(() => filterOptions(emptyLabel ? [{ value: '', label: emptyLabel }, ...options] : options, q), [options, q, emptyLabel]);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => setHi(0), [q, open]);

  const pick = (v: string) => { onChange(v); setOpen(false); setQ(''); };

  let lastGroup: string | undefined;
  return (
    <div ref={box} className={cn('relative', className)}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 border border-border bg-transparent px-3 py-2 text-sm text-left disabled:opacity-50">
        <span className={cn('truncate', !current && 'text-muted-foreground')}>{current?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-40 left-0 right-0 mt-1 bg-background border border-border shadow-lg min-w-[220px]">
          <div className="flex items-center gap-2 px-3 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) pick(list[hi].value); }
                else if (e.key === 'Escape') setOpen(false);
              }}
              className="w-full bg-transparent py-2 text-sm outline-none" />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {list.map((o, i) => {
              const header = o.group && o.group !== lastGroup ? o.group : null;
              lastGroup = o.group;
              return (
                <li key={`${o.group ?? ''}:${o.value}`}>
                  {header && <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{header}</div>}
                  <button type="button" role="option" aria-selected={o.value === value} onMouseEnter={() => setHi(i)} onClick={() => pick(o.value)}
                    className={cn('w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-left', i === hi && 'bg-secondary')}>
                    <span className="truncate">{o.label}{o.hint && <span className="text-muted-foreground"> · {o.hint}</span>}</span>
                    {o.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
            {!list.length && <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
