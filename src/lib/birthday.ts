import { fromIstInput } from './format';

/** Was someone born ("1999-10-26") on this calendar day ("2026-10-26")? Feb 29 birthdays fall on Feb 28 in other years. */
export function bornOn(dob: string, day: string): boolean {
  const md = day.slice(5, 10);
  if (dob.slice(5, 10) === md) return true;
  const y = Number(day.slice(0, 4));
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return md === '02-28' && !leap && dob.slice(5, 10) === '02-29';
}

/** That calendar day only: from 00:00 IST until 00:00 IST the next day. */
export function dayWindow(day: string): { starts_at: string; expires_at: string } {
  const [y, m, d] = day.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { starts_at: fromIstInput(`${day}T00:00`)!, expires_at: fromIstInput(`${next}T00:00`)! };
}
