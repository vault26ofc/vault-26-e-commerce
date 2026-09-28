const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i;

/** True for video files and Cloudinary video delivery URLs; everything else renders as an image. */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return VIDEO_EXT.test(url) || /res\.cloudinary\.com\/[^/]+\/video\//.test(url);
}

/** Returns a copy with item i moved one step (dir -1 up, +1 down); out-of-range moves are no-ops. */
export function moveItem<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list.slice();
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
