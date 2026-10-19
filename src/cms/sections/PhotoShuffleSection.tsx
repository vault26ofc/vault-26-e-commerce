import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { CMSSection } from '../types';
import { Media } from '@/components/shared/Media';
import { TornEdge } from '@/components/polka/Polka';
import { resolveHref, type LinkValue } from '@/lib/links';
import { isVideoUrl } from '@/lib/media';

// 3×4 grid: 8 photos, 2 empty ink cells and a pinned 2-cell brand tile. Tiles slide into a
// neighbouring empty cell, sliding-puzzle style, so every move is a short glide.
type Cell = { kind: 'photo'; src: string } | { kind: 'brand' } | { kind: 'empty'; n: number };
const COLS = 3;
// The brand tile is pinned across two cells (row 2); the other 10 slots shuffle around it.
const PATTERN: ('photo' | 0 | 1)[] = ['photo', 0, 'photo', 'photo', 'photo', 'photo', 'photo', 'photo', 1, 'photo'];
const neighbours = (i: number, len: number) =>
  [i - COLS, i + COLS, i % COLS ? i - 1 : -1, (i + 1) % COLS ? i + 1 : -1].filter((j) => j >= 0 && j < len);
const cellKey = (c: Cell) => (c.kind === 'photo' ? c.src : c.kind === 'brand' ? 'brand' : `empty-${c.n}`);

/*
 * Polka photo shuffle (video 4): black-and-white tiles on an ink grid swap
 * places every couple of seconds, next to a large lookbook panel.
 */
export default function PhotoShuffleSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as {
    image?: string; cta_href?: string; cta_link?: LinkValue; photos?: { image?: string }[];
    brand?: string; brand_lines?: string; panel_title?: string; cta_label?: string;
  };
  const custom = (cfg.photos || []).map((p) => p.image).filter(Boolean) as string[];
  const [cells, setCells] = useState<Cell[]>(() => {
    // The 3×4 pattern filled with the admin's photos (repeated if fewer than 8); none = ink cells.
    let k = 0;
    return PATTERN.map((c): Cell => (c !== 'photo' ? { kind: 'empty', n: c }
      : custom.length ? { kind: 'photo', src: `${custom[k % custom.length]}#${k++}` } : { kind: 'empty', n: 10 + k++ }));
  });

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const lastMoved = new Set<string>();
    const t = setInterval(() => {
      setCells((prev) => {
        const next = [...prev];
        // Every empty cell pulls in one neighbouring tile (avoid undoing the last move).
        next.forEach((c, i) => {
          if (c.kind !== 'empty') return;
          const options = neighbours(i, next.length).filter((j) => next[j].kind !== 'empty' && !lastMoved.has(cellKey(next[j])));
          if (!options.length) return;
          const j = options[Math.floor(Math.random() * options.length)];
          lastMoved.clear();
          lastMoved.add(cellKey(next[j]));
          [next[i], next[j]] = [next[j], next[i]];
        });
        return next;
      });
    }, 1700);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative bg-[#0F0F0F] overflow-hidden">
      <TornEdge color="#FFFFFF" position="top" seed={61} />
      <div className="grid md:grid-cols-[1.25fr_1fr] min-h-[560px] md:min-h-[min(46vw,720px)]">
        {/* Shuffling grid */}
        <div className="grid grid-cols-3 grid-rows-4 gap-[2px] p-[2px] pt-[clamp(28px,4vw,64px)] pb-[clamp(28px,4vw,64px)]">
          <div style={{ gridRow: 2, gridColumn: '1 / span 2' }} className="relative z-[1] bg-[#0F0F0F] p-4 md:p-7 flex flex-col justify-center text-white">
            <span className="font-display font-[800] uppercase text-[clamp(36px,5vw,76px)] leading-[0.85]">{cfg.brand}</span>
            <span className="font-sans uppercase text-[12px] md:text-[15px] leading-[1.5] mt-3 md:mt-4 text-white/85">
              {(cfg.brand_lines || '').split('\n').filter(Boolean).map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}
            </span>
          </div>
          {cells.map((c) => (
            <motion.div
              key={cellKey(c)}
              layout
              transition={{ layout: { duration: 1.1, ease: [0.65, 0, 0.35, 1] } }}
              className="relative overflow-hidden bg-[#0F0F0F]"
            >
              {c.kind === 'photo' && (
                isVideoUrl(c.src.split('#')[0])
                  ? <video src={c.src.split('#')[0]} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.1]" />
                  : <img src={c.src.split('#')[0]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.1]" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Lookbook panel */}
        <Link to={resolveHref(cfg.cta_link ?? cfg.cta_href, '/lookbook')} className="group relative block min-h-[380px] overflow-hidden">
          {cfg.image && (
            <Media
              src={cfg.image}
              alt="Lookbook"
              loading="lazy"
              sizes="(min-width: 768px) 50vw, 100vw"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8 pb-[clamp(56px,7vw,100px)] flex items-end justify-between gap-4">
            {cfg.panel_title && <span className="bg-[#BB0006] text-white font-display font-[800] uppercase text-[30px] md:text-[44px] leading-[0.95] px-[0.14em] pt-[0.1em]">
              {cfg.panel_title}
            </span>}
            {cfg.cta_label && <span className="bg-white text-[#BB0006] font-sans text-[14px] md:text-[15px] h-11 px-6 flex items-center group-hover:bg-[#F1F1F1]">
              {cfg.cta_label}
            </span>}
          </div>
        </Link>
      </div>
      <TornEdge color="#FFFFFF" position="bottom" seed={67} />
    </section>
  );
}
