import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { X } from 'lucide-react';
import type { CMSSection } from '../types';

const SWATCHES = [
  { name: 'Paper', hex: '#FFFFFF', q: 'white', ink: '#0F0F0F' },
  { name: 'Margins', hex: '#F1F1F1', q: 'grey', ink: '#0F0F0F' },
  { name: "Editor's red", hex: '#BB0006', q: 'red', ink: '#FFFFFF' },
  { name: 'Archive red', hex: '#AA0001', q: 'burgundy', ink: '#FFFFFF' },
  { name: 'Print ink', hex: '#0F0F0F', q: 'black', ink: '#FFFFFF' },
];

// Scroll windows (0–1 of the pinned run) for each beat of the reveal.
const BAR_START = 0.04;
const BAR_STEP = 0.09;
const PANEL = [0.5, 0.68] as const;
const TITLE = [0.62, 0.9] as const;

function Bar({ s, i, progress, onOpen }: { s: (typeof SWATCHES)[number]; i: number; progress: MotionValue<number>; onOpen: () => void }) {
  const a = BAR_START + i * BAR_STEP;
  // Each bar slides in from the right edge with a small overshoot, like the board video.
  const x = useTransform(progress, [a, a + 0.1, a + 0.13], ['105vw', '-1.5vw', '0vw']);
  return (
    <motion.div
      style={{ x, background: s.hex, color: s.ink, zIndex: 10 - i }}
      className="relative h-full basis-[9%] md:basis-[7%] shrink-0 will-change-transform shadow-[-8px_0_24px_rgba(0,0,0,0.12)]"
    >
      <button onClick={onOpen} className="absolute inset-0 flex flex-col justify-between items-center py-5 hover:brightness-95" aria-label={`Open ${s.name}`}>
        <span className="[writing-mode:vertical-rl] rotate-180 font-sans text-[11px] md:text-[13px] uppercase tracking-wide opacity-80">{s.hex}</span>
        <span className="[writing-mode:vertical-rl] rotate-180 font-sans text-[11px] md:text-[13px] uppercase tracking-wide">{s.name}</span>
      </button>
    </motion.div>
  );
}

function Letter({ ch, i, n, progress }: { ch: string; i: number; n: number; progress: MotionValue<number> }) {
  const a = TITLE[0] + (i / n) * (TITLE[1] - TITLE[0] - 0.06);
  const y = useTransform(progress, [a, a + 0.06], ['110%', '0%']);
  if (ch === ' ') return <span className="inline-block w-[0.25em]" />;
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <motion.span style={{ y }} className="inline-block will-change-transform">{ch}</motion.span>
    </span>
  );
}

/*
 * Polka colour board (video 2) as “shop by colour”: pinned for two screens.
 * Scrolling slides the palette bars in one by one, sweeps the ink panel
 * across, then sets the title letter by letter. Each bar opens a colour search.
 */
export default function ColourStorySection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as { title?: string };
  const title = cfg.title || 'Colour stories';
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const panelX = useTransform(scrollYProgress, [PANEL[0], PANEL[1]], ['100%', '0%']);
  const metaOpacity = useTransform(scrollYProgress, [TITLE[0], TITLE[0] + 0.08], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [TITLE[1] - 0.08, TITLE[1]], [30, 0]);
  const [open, setOpen] = useState<number | null>(null);
  const sw = open !== null ? SWATCHES[open] : null;

  return (
    <section ref={ref} className="relative h-[300vh] bg-white" data-section="colour-story">
      <div className="sticky top-0 h-screen overflow-hidden flex bg-white border-y border-[#0F0F0F]/10">
        {SWATCHES.map((s, i) => (
          <Bar key={s.hex} s={s} i={i} progress={scrollYProgress} onOpen={() => setOpen(i)} />
        ))}
        <div className="relative flex-1 overflow-hidden">
          <motion.div style={{ x: panelX }} className="absolute inset-0 bg-[#0F0F0F] text-white p-5 md:p-10 flex flex-col justify-between will-change-transform">
            <motion.p style={{ opacity: metaOpacity }} className="self-end font-sans text-[13px] md:text-[14px] text-white/80">Shop by colour</motion.p>
            <div>
              <motion.p style={{ opacity: metaOpacity }} className="font-sans uppercase text-[13px] md:text-[15px] mb-2">Lato · body</motion.p>
              <h2 className="font-display font-[800] uppercase leading-[0.85] text-[clamp(44px,9vw,140px)]" aria-label={title}>
                {title.split(' ').map((word, w, arr) => {
                  const before = arr.slice(0, w).join(' ').length + (w ? 1 : 0);
                  return (
                    <span key={w} className="inline-block whitespace-nowrap mr-[0.25em]">
                      {word.split('').map((ch, k) => (
                        <Letter key={k} ch={ch} i={before + k} n={title.length} progress={scrollYProgress} />
                      ))}
                    </span>
                  );
                })}
              </h2>
              <motion.div style={{ opacity: metaOpacity, y: ctaY }}>
                <Link to="/shop" className="inline-flex mt-6 h-11 md:h-12 px-7 items-center bg-[#BB0006] text-white font-sans text-[15px] hover:bg-[#AA0001] transition-colors">
                  Explore the palette
                </Link>
              </motion.div>
            </div>
          </motion.div>

          {/* Expanded colour: the chosen bar unfolds across the panel */}
          <AnimatePresence>
            {sw && (
              <motion.div
                key={sw.hex}
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                animate={{ clipPath: 'inset(0 0% 0 0)' }}
                exit={{ clipPath: 'inset(0 100% 0 0)' }}
                transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
                className="absolute inset-0 z-20 p-5 md:p-10 flex flex-col justify-between border-l border-black/10"
                style={{ background: sw.hex, color: sw.ink }}
              >
                <div className="flex items-start justify-between">
                  <span className="font-sans uppercase text-[13px] md:text-[15px]">{sw.hex}</span>
                  <button onClick={() => setOpen(null)} aria-label="Close colour" className="w-10 h-10 flex items-center justify-center border" style={{ borderColor: sw.ink }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div>
                  <motion.h3
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    className="font-display font-[800] uppercase leading-[0.82] text-[clamp(48px,11vw,190px)]"
                  >
                    {sw.name}
                  </motion.h3>
                  <p className="font-sans text-[15px] md:text-[16px] mt-4 max-w-[440px] opacity-85">
                    Every piece in the archive cut in {sw.name.toLowerCase()} tones — tees, knits, outerwear and accessories.
                  </p>
                  <Link
                    to={`/search?q=${encodeURIComponent(sw.q)}`}
                    className="inline-flex mt-6 h-12 px-8 items-center font-sans text-[15px] transition-opacity hover:opacity-85"
                    style={{ background: sw.ink, color: sw.hex }}
                  >
                    Shop {sw.name.toLowerCase()}
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
