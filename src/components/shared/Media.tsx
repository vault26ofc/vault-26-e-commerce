import { forwardRef, type ImgHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { isVideoUrl } from '@/lib/media';

type Props = ImgHTMLAttributes<HTMLImageElement> & { src?: string };

/** Renders an admin-chosen image OR video (muted, looping, inline) from one URL. */
export const Media = forwardRef<HTMLImageElement & HTMLVideoElement, Props>(function Media({ src, alt, loading, ...rest }, ref) {
  if (src && isVideoUrl(src)) {
    const { onLoad: _onLoad, ...videoProps } = rest as Record<string, unknown>;
    return <video ref={ref} src={src} autoPlay muted loop playsInline aria-label={alt} {...(videoProps as object)} />;
  }
  return <img ref={ref} src={src} alt={alt ?? ''} loading={loading} {...rest} />;
});

/** Animatable version for framer-motion props (initial/animate/whileInView…). */
export const MotionMedia = motion.create(Media);
