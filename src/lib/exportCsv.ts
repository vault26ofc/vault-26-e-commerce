// Lightweight CSV export utilities

function escapeCell(v: any): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Record<string, any>[], columns?: string[]): string {
  if (!rows.length) return '';
  const set = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
  const cols = columns || Array.from(set);
  const header = cols.map(escapeCell).join(',');
  const body = rows.map((r) => cols.map((c) => escapeCell(r[c])).join(',')).join('\n');
  return header + '\n' + body;
}

export function downloadBlob(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Record<string, any>[], columns?: string[]) {
  downloadBlob(filename, toCsv(rows, columns));
}

export function downloadJson(filename: string, data: any) {
  downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json');
}
