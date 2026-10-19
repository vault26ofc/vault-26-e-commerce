import { describe, it, expect } from 'vitest';
import { cldImage, cldSrcSet, imageProps } from './image';
import { sortSizes, isOneSize } from './sizes';
import { fetchAllRows, fetchAllByIds } from './fetchAll';
import { fmtCalendarDate, fromIstInput, istDay, toIstInput } from './format';

const ORIGINAL = 'https://res.cloudinary.com/demo/image/upload/v1776861404/shirt.jpg';

describe('cldImage', () => {
  it('adds display transforms to an original upload URL', () => {
    expect(cldImage(ORIGINAL, 800)).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:best,w_800,c_limit/v1776861404/shirt.jpg');
  });
  it('leaves already-transformed, non-Cloudinary and video URLs alone', () => {
    const t = 'https://res.cloudinary.com/demo/image/upload/w_200,c_fill/v1/shirt.jpg';
    expect(cldImage(t, 800)).toBe(t);
    expect(cldImage('https://example.com/a.jpg', 800)).toBe('https://example.com/a.jpg');
    const v = 'https://res.cloudinary.com/demo/video/upload/v1/clip.mp4';
    expect(cldImage(v, 800)).toBe(v);
  });
  it('upscale is opt-in', () => {
    expect(cldImage(ORIGINAL, 640, { upscale: true })).toContain('/upload/e_upscale/f_auto');
  });
  it('builds a srcset only for Cloudinary images and lazy-loads unless priority', () => {
    expect(cldSrcSet(ORIGINAL, 640).split(', ')).toHaveLength(3);
    expect(cldSrcSet('/local.png')).toBe('');
    expect(imageProps(ORIGINAL).loading).toBe('lazy');
    expect(imageProps(ORIGINAL, { priority: true })).toMatchObject({ loading: 'eager', fetchpriority: 'high' });
  });
});

describe('sortSizes', () => {
  it('uses the admin order first, then the conventional order', () => {
    expect(sortSizes(['L', 'S', 'XL', 'M'])).toEqual(['S', 'M', 'L', 'XL']);
    expect(sortSizes(['34', '30', '32'])).toEqual(['30', '32', '34']);
    expect(sortSizes(['S', 'M', 'L'], ['L', 'M'])).toEqual(['L', 'M', 'S']);
  });
  it('treats blank and ONE SIZE as no size', () => {
    expect(isOneSize('one size')).toBe(true);
    expect(isOneSize('')).toBe(true);
    expect(isOneSize('M')).toBe(false);
  });
});

describe('fetchAllRows', () => {
  const table = Array.from({ length: 2345 }, (_, i) => ({ id: i }));
  const query = (rows: { id: number }[]) => ({
    range: async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }),
  });
  it('reads every page', async () => {
    const all = await fetchAllRows(() => query(table));
    expect(all).toHaveLength(2345);
    expect(all[2344].id).toBe(2344);
  });
  it('throws on error', async () => {
    await expect(fetchAllRows(() => ({ range: async () => ({ data: null, error: new Error('boom') }) }))).rejects.toThrow('boom');
  });
  it('chunks long id lists and drops duplicates', async () => {
    const seen: number[] = [];
    const ids = [...Array.from({ length: 400 }, (_, i) => `id${i}`), 'id1', null];
    const out = await fetchAllByIds(ids, (chunk) => { seen.push(chunk.length); return query(chunk.map((_, i) => ({ id: i }))); }, 150);
    expect(seen).toEqual([150, 150, 100]);
    expect(out).toHaveLength(400);
  });
});

describe('IST dates', () => {
  it('groups by the IST calendar day', () => {
    expect(istDay('2026-10-18T19:00:00Z')).toBe('2026-10-19');
    expect(istDay('2026-10-18T18:00:00Z')).toBe('2026-10-18');
  });
  it('round-trips datetime-local values in IST', () => {
    expect(fromIstInput('2026-10-19T09:30')).toBe('2026-10-19T04:00:00.000Z');
    expect(toIstInput('2026-10-19T04:00:00.000Z')).toBe('2026-10-19T09:30');
    expect(fromIstInput('')).toBeNull();
  });
  it('formats birthdays without shifting the day', () => {
    expect(fmtCalendarDate('1999-05-04')).toBe('04 May 1999');
  });
});
