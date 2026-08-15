import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import type { CMSSection, HeroConfig } from '../types';

const EASE_PRIMARY = [0.22, 1, 0.36, 1];

export default function HeroSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as HeroConfig;
  const sectionRef = useRef<HTMLElement>(null);

  // Acne Studios Style 100vh Natural Scroll Parallax & Fade-out
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start']
  });

  const titleParallaxY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const metaParallaxY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const ctaParallaxY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  const headingText = cfg.heading || 'VAULT 26';
  const eyebrowText = cfg.eyebrow || 'ESTABLISHED MMXXVI // ARCHIVE 01';
  const subtext = cfg.social_proof_text || 'CLOTHING THAT HIGHLIGHTS CHARACTER AND STAYS TIMELESS.';
  const ctaText = cfg.search_cta || 'EXPLORE COLLECTION';
  const ctaHref = cfg.cta_href || '/shop';

  return (
    <section ref={sectionRef} className="relative w-full h-screen bg-black text-white font-sans select-none overflow-hidden">
      {/* Background Image — Full 100vh Viewport */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <motion.img
          style={{ scale: imageScale }}
          src={
            cfg.background_image ||
            'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=95&w=2400'
          }
          alt="VAULT 26 Editorial Campaign"
          className="w-full h-full object-cover object-center brightness-90"
        />
        {/* Subtle cinematic gradient vignette for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/70 pointer-events-none" />
      </div>

      {/* Acne Studios Centered Hero Typography — 100vh with Natural Scroll Parallax */}
      <motion.div
        style={{ opacity: heroOpacity }}
        className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center z-10"
      >
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center">
          {/* Eyebrow / Metadata */}
          <motion.div style={{ y: metaParallaxY }}>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_PRIMARY }}
              className="text-xs sm:text-sm font-mono tracking-[0.35em] uppercase text-white/80 mb-4 block"
            >
              {eyebrowText}
            </motion.span>
          </motion.div>

          {/* Main Display Title */}
          <motion.div style={{ y: titleParallaxY }} className="overflow-hidden py-2 my-1">
            <motion.h1
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: '0%' }}
              transition={{ duration: 1.0, delay: 0.2, ease: EASE_PRIMARY }}
              className="text-6xl sm:text-8xl md:text-[11vw] lg:text-[13vw] font-serif font-bold tracking-[0.16em] uppercase text-white drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)] leading-none"
            >
              {headingText}
            </motion.h1>
          </motion.div>

          {/* Subtext */}
          <motion.div style={{ y: metaParallaxY }}>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: EASE_PRIMARY }}
              className="text-xs sm:text-base font-sans tracking-[0.2em] text-white/70 max-w-xl mt-4 uppercase font-light"
            >
              {subtext}
            </motion.p>
          </motion.div>

          {/* CTA Link */}
          <motion.div style={{ y: ctaParallaxY }} className="mt-8 pointer-events-auto">
            <motion.a
              href={ctaHref}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7, ease: EASE_PRIMARY }}
              className="inline-flex items-center gap-3 text-xs font-sans tracking-[0.25em] uppercase font-semibold text-white group border-b border-white/40 pb-1 hover:border-white transition-colors"
            >
              <span className="group-hover:translate-x-1 transition-transform duration-300">
                {ctaText}
              </span>
              <span className="group-hover:translate-x-2 transition-transform duration-300">
                →
              </span>
            </motion.a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
