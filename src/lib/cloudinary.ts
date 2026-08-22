const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;

type Opts = {
  w?: number;
  h?: number;
  q?: number | "auto";
  f?: "auto" | "webp" | "avif" | "jpg" | "png";
  c?: "fill" | "crop" | "scale" | "limit" | "fit" | "pad";
  dpr?: "auto" | "1.0" | "2.0";
  gravity?: string;
  blur?: number;
};

function isCloudinaryUrl(src: string): boolean {
  return Boolean(src?.includes("res.cloudinary.com"));
}

export function imgUrl(src: string, opts: Opts = {}): string {
  if (!src) return "";
  if (!isCloudinaryUrl(src)) return src;

  const [base, rest] = src.split("/upload/");
  if (!rest) return src;

  const transforms: string[] = [
    `f_${opts.f ?? "auto"}`,
    `q_${opts.q ?? "auto"}`,
    `dpr_${opts.dpr ?? "auto"}`,
    opts.w ? `w_${opts.w}` : "",
    opts.h ? `h_${opts.h}` : "",
    `c_${opts.c ?? "fill"}`,
    opts.gravity ? `g_${opts.gravity}` : "",
    opts.blur ? `e_blur:${opts.blur}` : "",
  ].filter(Boolean);

  return `${base}/upload/${transforms.join(",")}/${rest}`;
}

export function imgSrcset(
  src: string,
  widths = [400, 800, 1200, 1600]
): string {
  if (!src || !isCloudinaryUrl(src)) return "";
  return widths
    .map((w) => `${imgUrl(src, { w, f: "auto", q: "auto" })} ${w}w`)
    .join(", ");
}

// Convenience: product card thumbnail (3:4 portrait)
export function productThumb(src: string, size = 600): string {
  return imgUrl(src, { w: size, h: Math.round(size * (4 / 3)), f: "auto", q: "auto", c: "fill" });
}

// Convenience: OG image (1200×630)
export function ogImage(src: string): string {
  return imgUrl(src, { w: 1200, h: 630, f: "jpg", q: 85, c: "fill" });
}

// Tiny blurred placeholder (20px wide) for blur-up effect
export function blurPlaceholder(src: string): string {
  return imgUrl(src, { w: 20, q: 30, f: "auto", blur: 200 });
}
