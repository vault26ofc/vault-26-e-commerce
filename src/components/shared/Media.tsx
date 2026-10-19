import { forwardRef, useEffect, useState, type ImgHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { isVideoUrl } from '@/lib/media';
import { imageProps, type ResponsiveOpts } from '@/lib/image';

const PHONE_QUERY = '(max-width: 767px)';

/** True on phone-width screens. Read synchronously on first render, so phones never load the desktop file first. */
export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mql.matches);
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return phone;
}

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string;
  /** Optional phone-only replacement (image or video). Empty = phones get `src`. */
  mobileSrc?: string | null;
  /** Above the fold: load first instead of lazily. */
  priority?: boolean;
  /** How wide the media is shown (the `sizes` attribute), for picking the right Cloudinary width. */
  sizes?: string;
  maxWidth?: ResponsiveOpts['maxWidth'];
};

/** Renders an admin-chosen image OR video (muted, looping, inline) from one URL, with an optional phone-only override. */
export const Media = forwardRef<HTMLImageElement & HTMLVideoElement, Props>(function Media(
  { src, mobileSrc, alt, loading, priority, sizes, maxWidth, ...rest }, ref,
) {
  const phone = useIsPhone();
  const url = phone && mobileSrc ? mobileSrc : src;
  if (url && isVideoUrl(url)) {
    const { onLoad: _onLoad, ...videoProps } = rest as Record<string, unknown>;
    return <video ref={ref} key={url} src={url} autoPlay muted loop playsInline preload={priority ? 'auto' : 'metadata'} aria-label={alt} {...(videoProps as object)} />;
  }
  const img = imageProps(url, { sizes, maxWidth, priority: priority ?? loading === 'eager' });
  return <img ref={ref} alt={alt ?? ''} {...img} {...rest} />;
});

/** Animatable version for framer-motion props (initial/animate/whileInView…). */
export const MotionMedia = motion.create(Media);
