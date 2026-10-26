import { useEffect, useState, useSyncExternalStore } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/**
 * Styled replacements for the browser's prompt() and confirm(). Mount <AskDialogHost /> once;
 * then `await askText({...})` (the typed text, or null on cancel) or `await askConfirm({...})`.
 */
type Question = {
  title: string;
  body?: React.ReactNode;
  okLabel?: string;
  /** Present for askText: the input's label, starting value and checks. */
  input?: { label?: string; initial?: string; placeholder?: string; type?: 'text' | 'number'; validate?: (v: string) => string | null };
};
type Open = Question & { resolve: (v: string | null) => void };

let current: Open | null = null;
const listeners = new Set<() => void>();
const show = (q: Open | null) => { current = q; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function ask(q: Question): Promise<string | null> {
  return new Promise((resolve) => {
    current?.resolve(null); // a new question cancels one still open
    show({ ...q, resolve });
  });
}
export const askText = (q: Question & { input: NonNullable<Question['input']> }) => ask(q);
export const askConfirm = async (q: Omit<Question, 'input'>) => (await ask(q)) !== null;

const btn = 'px-4 py-2 text-xs uppercase tracking-widest';

export function AskDialogHost() {
  const q = useSyncExternalStore(subscribe, () => current);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setValue(q?.input?.initial ?? ''); setError(null); }, [q]);

  const close = (v: string | null) => { q?.resolve(v); show(null); };
  const submit = () => {
    if (!q?.input) return close('');
    const problem = q.input.validate?.(value) ?? null;
    if (problem) return setError(problem);
    close(value);
  };

  return (
    <Dialog open={!!q} onOpenChange={(o) => { if (!o) close(null); }}>
      <DialogContent className="rounded-none sm:rounded-none max-w-md p-0 gap-0">
        {q && (
          <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="px-6 pt-6 pb-5 space-y-3">
              <DialogTitle className="font-display text-xl pr-6">{q.title}</DialogTitle>
              {q.body ? <DialogDescription className="text-sm text-muted-foreground whitespace-pre-line">{q.body}</DialogDescription>
                : <DialogDescription className="sr-only">{q.title}</DialogDescription>}
              {q.input && (
                <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                  {q.input.label}
                  <input autoFocus type={q.input.type || 'text'} min={q.input.type === 'number' ? 0 : undefined}
                    value={value} placeholder={q.input.placeholder} onChange={(e) => { setValue(e.target.value); setError(null); }}
                    className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm normal-case tracking-normal text-foreground focus:outline-none focus:border-foreground" />
                  {error && <span className="mt-1.5 block normal-case tracking-normal text-[12px] text-destructive">{error}</span>}
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button type="button" onClick={() => close(null)} className={`${btn} border border-border hover:border-foreground`}>Cancel</button>
              <button type="submit" className={`${btn} bg-foreground text-background`}>{q.okLabel || 'OK'}</button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
