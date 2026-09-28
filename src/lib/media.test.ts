import { describe, it, expect } from 'vitest';
import { isVideoUrl, moveItem } from './media';

describe('isVideoUrl', () => {
  it('detects video files and Cloudinary video URLs', () => {
    expect(isVideoUrl('https://x.com/a.mp4')).toBe(true);
    expect(isVideoUrl('https://x.com/a.webm?x=1')).toBe(true);
    expect(isVideoUrl('https://res.cloudinary.com/demo/video/upload/v1/clip')).toBe(true);
  });
  it('treats everything else as an image', () => {
    expect(isVideoUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg')).toBe(false);
    expect(isVideoUrl('')).toBe(false);
    expect(isVideoUrl(null)).toBe(false);
  });
});

describe('moveItem', () => {
  it('moves up and down within bounds', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });
});
