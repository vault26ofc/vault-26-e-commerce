import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { CMSSection } from '../types';
import { TextColumns, TornEdge, Wrap } from '@/components/polka/Polka';
import { resolveHref, type LinkValue } from '@/lib/links';
import { isVideoUrl } from '@/lib/media';
import { imageProps } from '@/lib/image';
import { useIsPhone } from '@/components/shared/Media';

export interface CampaignSlide {
  id?: string;
  title: string;
  cta_label: string;
  cta_href?: string;
  cta_link?: LinkValue;
  image: string;
  image_mobile?: string;
}
type Stat = { n: string; label: string; sub: string };
type CarouselConfig = {
  slides?: CampaignSlide[]; brand?: string; statement?: string; highlight?: string; body?: string; stats?: Stat[];
};

export default function CampaignCarouselSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as CarouselConfig;
  // Only what's set in Admin → CMS; no slides = no section.
  const slides: CampaignSlide[] = (cfg.slides || []).filter((s) => s.image).map((s, i) => ({ ...s, id: s.id || `slide-${i}` }));
  const stats: Stat[] = (cfg.stats || []).filter((s) => s.n || s.label);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  const slide = slides[index % Math.max(slides.length, 1)];
  const phone = useIsPhone();
  // Optional phone-only photo/video per slide; empty = phones use the normal one.
  const media = slide ? (phone && slide.image_mobile) || slide.image : '';

  if (!slide) return null;

  return (
    <section className="relative bg-white">
      {/* Torn black-and-white campaign photo */}
      <div
        className="relative h-[56vw] md:h-[42vw] max-h-[640px] min-h-[300px] overflow-hidden bg-[#0F0F0F]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence initial={false}>
          {isVideoUrl(media) ? (
            <motion.video
              key={`${slide.id}-${media}`}
              src={media}
              autoPlay muted loop playsInline
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.05]"
            />
          ) : (
            <motion.img
              key={`${slide.id}-${media}`}
              {...imageProps(media, { sizes: '100vw', priority: index === 0 })}
              alt={slide.title}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.05]"
            />
          )}
        </AnimatePresence>
        <TornEdge color="#FFFFFF" position="top" seed={23} />
        <Wrap className="relative z-[3] h-full">
          <div className="pt-[clamp(40px,5vw,72px)] flex items-start justify-between">
            <span className="font-display font-[800] uppercase text-white text-[20px] md:text-[26px] leading-none">{cfg.brand}</span>
            {slide.cta_label && (
              <Link to={resolveHref(slide.cta_link ?? slide.cta_href, '/shop')} className="font-sans text-white text-[13px] md:text-[14px] uppercase underline underline-offset-4">
                {slide.cta_label}
              </Link>
            )}
          </div>
        </Wrap>
        <TornEdge color="#BB0006" position="bottom" seed={31} height="clamp(30px,4.5vw,70px)" />
      </div>

      {/* Red statement + stats */}
      <div className="relative bg-[#BB0006] text-white pb-[clamp(60px,8vw,120px)]">
        <Wrap className="pt-6 md:pt-8">
          <h2 className="font-display font-[800] uppercase leading-[1.02] text-[clamp(30px,4.4vw,64px)] max-w-[1200px]">
            {[slide.title && `${slide.title}.`, cfg.statement].filter(Boolean).join(' ')}{' '}
            {cfg.highlight && <span className="bg-white text-[#BB0006] px-[0.12em]">{cfg.highlight}</span>}
          </h2>

          <div className="mt-8 md:mt-10 grid md:grid-cols-2 gap-10">
            <TextColumns count={6} color="rgba(255,255,255,0.55)" className="hidden md:grid h-[260px]" />
            <div>
              <p className="font-sans text-[15px] md:text-[16px] leading-relaxed max-w-[520px]">
                {cfg.body}
              </p>
              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8">
                {stats.map((s, i) => (
                  <div key={i}>
                    <dt className="font-sans font-light text-[44px] md:text-[56px] leading-none border-b border-white/80 pb-1">{s.n}</dt>
                    <dd className="font-sans text-[13px] md:text-[14px] mt-2 leading-snug">
                      <span className="font-bold">{s.label} —</span>
                      <br />
                      {s.sub}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {slides.length > 1 && (
            <div className="mt-10 flex gap-2" role="tablist" aria-label="Campaigns">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={s.title}
                  onClick={() => setIndex(i)}
                  className={`h-[3px] flex-1 max-w-[120px] transition-colors ${i === index ? 'bg-white' : 'bg-white/35 hover:bg-white/60'}`}
                />
              ))}
            </div>
          )}
        </Wrap>
        <TornEdge color="#FFFFFF" position="bottom" seed={43} />
      </div>
    </section>
  );
}
