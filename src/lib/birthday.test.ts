import { describe, it, expect } from 'vitest';
import { bornOn, dayWindow } from './birthday';

describe('dayWindow', () => {
  it('runs from midnight to midnight IST on that day', () => {
    expect(dayWindow('2026-10-26')).toEqual({ starts_at: '2026-10-25T18:30:00.000Z', expires_at: '2026-10-26T18:30:00.000Z' });
  });
  it('crosses month and year ends', () => {
    expect(dayWindow('2026-12-31').expires_at).toBe('2026-12-31T18:30:00.000Z');
    expect(dayWindow('2028-02-28').expires_at).toBe('2028-02-28T18:30:00.000Z');
  });
});

describe('bornOn', () => {
  it('matches day and month, whatever the birth year', () => {
    expect(bornOn('1999-10-26', '2026-10-26')).toBe(true);
    expect(bornOn('1999-10-26', '2026-10-27')).toBe(false);
    expect(bornOn('1999-11-26', '2026-10-26')).toBe(false);
  });
  it('celebrates Feb 29 birthdays on Feb 28 when the year has no Feb 29', () => {
    expect(bornOn('2000-02-29', '2026-02-28')).toBe(true);
    expect(bornOn('2000-02-29', '2028-02-28')).toBe(false);
    expect(bornOn('2000-02-29', '2028-02-29')).toBe(true);
    expect(bornOn('2000-02-28', '2026-02-28')).toBe(true);
  });
});
