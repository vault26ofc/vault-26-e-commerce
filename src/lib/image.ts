// Display-time Cloudinary transforms. The database always stores the ORIGINAL secure_url
// (…/image/upload/v123/name.jpg); resizing happens only here, when an image is rendered.
// Non-Cloudinary URLs (and videos) pass through unchanged.

const WIDTHS = [320, 480, 640, 828, 1080, 1280, 1600, 1920, 2400];
const CLD_IMAGE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
// A first path segment like "f_auto,q_auto,w_800" means the URL is already transformed.
const TRANSFORM_SEGMENT = /^[a-z]{1,4}_[^/]*$/;

export function isCloudinaryImage(src: string | null | undefined): boolean {
  return !!src && CLD_IMAGE.test(src);
}

export type ImageOpts = {
  /**
   * Cloudinary generative upscale, for small sources only. It flattens transparency, so never
   * use it on transparent logos/PNGs.
   */
  upscale?: boolean;
};

/** f_auto, q_auto:best, at most `width` px wide (never enlarged). */
export function cldImage(src: string, width: number, opts: ImageOpts = {}): string {
  const m = src ? CLD_IMAGE.exec(src) : null;
  if (!m) return src;
  const [, base, rest] = m;
  const first = rest.split('/')[0];
  if (rest.includes('/') && TRANSFORM_SEGMENT.test(first) && !/^v\d+$/.test(first)) return src;
  const t = `f_auto,q_auto:best,w_${Math.round(width)},c_limit`;
  return `${base}${opts.upscale ? 'e_upscale/' : ''}${t}/${rest}`;
}

/** srcset for a Cloudinary image (empty string for anything else). */
export function cldSrcSet(src: string, maxWidth = 2400, opts: ImageOpts = {}): string {
  if (!isCloudinaryImage(src)) return '';
  return WIDTHS.filter((w) => w <= maxWidth).map((w) => `${cldImage(src, w, opts)} ${w}w`).join(', ');
}

export type ResponsiveOpts = ImageOpts & {
  /** The `sizes` attribute: how wide the image is shown, e.g. "(min-width: 768px) 25vw, 50vw". */
  sizes?: string;
  /** Largest width to request. */
  maxWidth?: number;
  /** Above-the-fold image: load immediately with high priority instead of lazily. */
  priority?: boolean;
};

/** Props for an <img>: optimised src + srcset/sizes, lazy unless `priority`. */
export function imageProps(src: string | null | undefined, { sizes = '100vw', maxWidth = 2400, priority = false, ...opts }: ResponsiveOpts = {}) {
  const s = src || '';
  const srcSet = cldSrcSet(s, maxWidth, opts);
  return {
    src: isCloudinaryImage(s) ? cldImage(s, Math.min(1600, maxWidth), opts) : s,
    ...(srcSet ? { srcSet, sizes } : {}),
    loading: (priority ? 'eager' : 'lazy') as 'eager' | 'lazy',
    decoding: 'async' as const,
    ...(priority ? { fetchpriority: 'high' } : {}),
  };
}
