export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── Dates: stored as UTC (timestamptz), always shown and compared in IST ────────────────────
export const IST = 'Asia/Kolkata';

type DateLike = string | number | Date | null | undefined;

const dateFmt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit' });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' });

const valid = (d: DateLike): Date | null => {
  if (d === null || d === undefined || d === '') return null;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
};

/** 19 Oct 2026 (IST). */
export const fmtDate = (d: DateLike) => { const x = valid(d); return x ? dateFmt.format(x) : '—'; };
/** 19 Oct 2026, 03:45 pm (IST). */
export const fmtDateTime = (d: DateLike) => { const x = valid(d); return x ? dateTimeFmt.format(x) : '—'; };
/** 03:45 pm (IST). */
export const fmtTime = (d: DateLike) => { const x = valid(d); return x ? timeFmt.format(x) : '—'; };
/** YYYY-MM-DD of an instant, in IST — for grouping by day and for file names. */
export const istDay = (d: DateLike = new Date()) => { const x = valid(d); return x ? dayKeyFmt.format(x) : ''; };

/** ISO instant → value for <input type="datetime-local">, read in IST. */
export function toIstInput(iso: string | null | undefined): string {
  const x = valid(iso);
  if (!x) return '';
  const ist = new Date(x.getTime() + 330 * 60_000);
  return ist.toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value typed in IST → ISO instant (null when empty). */
export function fromIstInput(v: string): string | null {
  if (!v) return null;
  const x = new Date(`${v.length === 16 ? `${v}:00` : v}+05:30`);
  return Number.isNaN(x.getTime()) ? null : x.toISOString();
}

/** Plain calendar date (e.g. a birthday, "1999-05-04") → "04 May 1999"; no time-zone shift. */
export function fmtCalendarDate(ymd: string | null | undefined): string {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }).format(Date.UTC(y, m - 1, d));
}
