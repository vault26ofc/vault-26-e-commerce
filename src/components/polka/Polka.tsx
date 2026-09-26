import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

/*
 * Polka design primitives — shared by every storefront section.
 * Palette (from the Polka brand board): Paper #FFFFFF · Margins #F1F1F1 ·
 * Editor's Red #BB0006 · Archive Red #AA0001 · Print Ink #0F0F0F.
 */
export const POLKA = {
  red: '#BB0006',
  archive: '#AA0001',
  ink: '#0F0F0F',
  margin: '#F1F1F1',
  paper: '#FFFFFF',
} as const;

/* ---------------------------------------------------------------- torn edge */

// Deterministic PRNG so torn edges are identical across renders.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function tornPath(seed: number, depth: number): string {
  const r = rng(seed);
  const pts: string[] = ['M0,100'];
  let y = 55;
  for (let x = 0; x <= 1000; x += 6 + r() * 10) {
    // Slow drift (hills) + fine paper fibres.
    y += (r() - 0.5) * 14;
    y = Math.max(100 - depth, Math.min(92, y));
    const fibre = (r() - 0.5) * 6;
    pts.push(`L${x.toFixed(1)},${(y + fibre).toFixed(1)}`);
  }
  pts.push('L1000,100', 'Z');
  return pts.join(' ');
}

/**
 * Ragged paper edge. `position="top"` sits at the top of a section and its
 * colour bleeds upward into the previous block; `bottom` mirrors it.
 */
export function TornEdge({
  color,
  position = 'bottom',
  seed = 7,
  height = 'clamp(28px, 4vw, 64px)',
  className,
}: {
  color: string;
  position?: 'top' | 'bottom';
  seed?: number;
  height?: string;
  className?: string;
}) {
  const d = useMemo(() => tornPath(seed, 88), [seed]);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      className={cn(
        'absolute left-0 w-full pointer-events-none z-[2]',
        position === 'bottom' ? 'bottom-0 translate-y-[1px]' : 'top-0 -translate-y-[1px] rotate-180',
        className,
      )}
      style={{ height }}
    >
      <path d={d} fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------ red box title */

/** Display heading set on a solid red block (“НОВИНКИ” style). */
export function RedTag({
  children,
  as: Tag = 'h2',
  inverted = false,
  className,
}: {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'span';
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        'inline-block font-display uppercase leading-[0.95] font-[800] px-[0.14em] pt-[0.1em] pb-[0.02em]',
        'text-[34px] md:text-[48px]',
        inverted ? 'bg-white text-[#BB0006]' : 'bg-[#BB0006] text-white',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Red underlined uppercase text link (“СМОТРЕТЬ ВСЕ”). */
export function SeeAll({ to, children = 'View all', light = false }: { to: string; children?: ReactNode; light?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        'font-sans text-[13px] md:text-[15px] uppercase underline underline-offset-4 decoration-1 hover:opacity-70 transition-opacity',
        light ? 'text-white' : 'text-[#BB0006]',
      )}
    >
      {children}
    </Link>
  );
}

/** Section header row: red tag left, “view all” right. */
export function SectionHead({ title, to, linkLabel, children }: { title: ReactNode; to?: string; linkLabel?: string; children?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-6 md:mb-8">
      <RedTag>{title}</RedTag>
      {children}
      {to && <SeeAll to={to}>{linkLabel ?? 'View all'}</SeeAll>}
    </div>
  );
}

/** Polka buttons: solid red, solid ink, outlined, white. */
export const polkaBtn = {
  base: 'inline-flex items-center justify-center font-sans text-[14px] md:text-[15px] h-11 md:h-12 px-6 transition-colors disabled:opacity-50 disabled:pointer-events-none',
  red: 'bg-[#BB0006] text-white hover:bg-[#AA0001]',
  ink: 'bg-[#3A3A3A] text-white hover:bg-[#0F0F0F]',
  outline: 'border border-[#0F0F0F] text-[#0F0F0F] bg-white hover:border-[#BB0006] hover:text-[#BB0006]',
  white: 'bg-white text-[#BB0006] hover:bg-[#F1F1F1]',
};

/** Page container matching Polka's 1440 grid (≈ 30px gutters at 1440). */
export function Wrap({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-[30px]', className)} style={style}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------ tilted text columns */

const COLUMN_TEXT =
  'VAULT 26 is an independent archive for clothing that outlives the season. We cut in heavyweight cotton, wool and denim, finish every seam by hand and release in small numbers, so each piece is worn for years rather than weeks. Every drop is a chapter: a study of silhouette, texture and the city that shaped it. We believe good clothing does not end at the checkout. It stays with you, takes on your habits and becomes part of your own story. Designed in India, made to be remembered. ';

// Tilt (deg) and vertical offset (%) for each column, traced from the Polka hero.
const COLUMN_LAYOUT: [number, number][] = [
  [0, 4], [0, 1], [0, 5], [9, 3], [0, 3], [0, 0], [-7, 5], [0, 1], [0, 3], [0, 0], [0, 4], [0, 1],
];

function Column({ i, progress, color }: { i: number; progress: MotionValue<number>; color: string }) {
  const [tilt, offset] = COLUMN_LAYOUT[i % COLUMN_LAYOUT.length];
  // The “moving blocks”: columns drift apart as the section scrolls, tilted ones swing.
  const dir = i % 2 === 0 ? 1 : -1;
  const y = useTransform(progress, [0, 1], [`${offset}%`, `${offset + (dir > 0 ? 10 + (i % 3) * 4 : 2)}%`]);
  const rotate = useTransform(progress, [0, 1], [tilt, tilt + (tilt !== 0 ? dir * 5 : 0)]);
  return (
    <motion.p
      style={{ y, rotate, color }}
      className="text-justify [text-align-last:justify] hyphens-auto text-[7px] md:text-[8.5px] leading-[1.25] font-sans select-none will-change-transform"
    >
      {COLUMN_TEXT.repeat(3)}
    </motion.p>
  );
}

/**
 * The Polka signature texture: narrow justified text columns, a few of them
 * knocked off-axis, drifting as the page scrolls.
 */
export function TextColumns({
  count = 12,
  color = 'rgba(255,255,255,0.92)',
  className,
}: {
  count?: number;
  color?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn('grid gap-x-[1.2%] overflow-hidden', className)}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn('h-full overflow-hidden', i >= 6 && 'hidden md:block')}>
          <Column i={i} progress={scrollYProgress} color={color} />
        </div>
      ))}
    </div>
  );
}

/** Small numbered label in display type (“01”). */
export function Num({ n, className }: { n: number; className?: string }) {
  return <span className={cn('font-display font-[800] tabular-nums', className)}>{String(n).padStart(2, '0')}</span>;
}

/**
 * Editorial filler tile for asymmetric product grids: Editor's Red paper,
 * drifting text columns behind a giant word, rotating stamp and a CTA.
 */
export function PromoTile({
  word = 'New in',
  kicker = 'Drop 01 · 2026',
  cta = 'Shop the drop',
  to = '/shop',
  className,
}: {
  word?: string;
  kicker?: string;
  cta?: string;
  to?: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn('group relative block bg-[#BB0006] text-white overflow-hidden aspect-[252/292]', className)}
    >
      <TextColumns count={5} color="rgba(0,0,0,0.25)" className="absolute inset-0 p-2" />
      <motion.span
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute top-3 right-3 w-[34%] aspect-square"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <path id="polka-stamp" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
          </defs>
          <circle cx="50" cy="50" r="48" fill="white" />
          <text fontSize="10.5" letterSpacing="2" fill="#BB0006" fontFamily="Lato, sans-serif">
            <textPath href="#polka-stamp">VAULT 26 · FREE SHIPPING · VAULT 26 · </textPath>
          </text>
          <text x="50" y="57" textAnchor="middle" fontSize="20" fill="#BB0006" fontFamily="Imbue, serif">26</text>
        </svg>
      </motion.span>
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
        <p className="font-sans uppercase text-[12px] md:text-[13px] text-white/85">{kicker}</p>
        <p className="font-display uppercase leading-[0.85] text-[clamp(46px,5.4vw,84px)] mt-1">{word}</p>
        <span className="mt-4 inline-flex h-10 px-5 items-center bg-white text-[#BB0006] font-sans text-[14px] group-hover:bg-[#F1F1F1] transition-colors">
          {cta}
        </span>
      </div>
    </Link>
  );
}
