import type { CSSProperties } from 'react';
import type { CMSSection, HeroConfig } from '../types';

/*
 * Editorial "torn paper" hero.
 *
 * Geometry is traced from a 933 × 588 reference frame (POSTER_W × POSTER_H).
 * X positions are percentages of the section width; Y positions are mapped
 * into the area below the fixed navbar (--nav), so the navbar never covers
 * the typography.
 */

const POSTER_W = 933;
const POSTER_H = 588;

// Stepped right edge of the photo: 24 horizontal bands on a uniform grid.
const BAND_START = 2;
const BAND_H = 24.08;
const BAND_EDGES = [
  466, 543, 434, 465, 543, 565, 519, 594, 509, 524, 448, 397,
  484, 356, 396, 484, 510, 464, 541, 426, 464, 509, 574, 595,
];

// Labels sit on the paper, flush against the photo edge of their band.
const LABELS: { band: number; text: string }[] = [
  { band: 2, text: 'SEPTEMBER 2026' },
  { band: 6, text: 'STREETWEAR' },
  { band: 10, text: 'ARCHIVE 01' },
  { band: 13, text: 'EST. MMXXVI' },
  { band: 17, text: 'NEW COLLECTION' },
];

// Torn black strip along the bottom edge (reference keypoints + fine jitter).
const TORN_KEYPOINTS: [number, number][] = [
  [0, 569.5], [10, 566], [25, 563], [40, 559.5], [55, 557], [70, 559.5], [85, 562],
  [110, 560.5], [135, 563], [160, 564.5], [180, 568], [205, 577], [225, 582], [255, 578],
  [285, 576], [315, 577], [345, 579.5], [375, 578], [405, 576], [435, 577], [470, 579],
  [505, 578], [545, 577], [585, 578.5], [610, 579.5], [620, 582], [630, 585], [645, 586],
  [670, 584], [685, 579.5], [705, 573], [735, 570], [765, 568], [795, 563], [815, 566],
  [845, 567], [875, 568], [895, 574.5], [920, 579.5], [933, 582],
];
const TORN_TOP = 555;

const RED = '#BB0006';
const PHOTO_SRC = '/polka_hero_editorial.jpg';
const PAPER_SRC = '/hero_paper_texture.jpg';

const pctX = (x: number) => `${((x / POSTER_W) * 100).toFixed(3)}%`;
const posY = (y: number) =>
  `calc(var(--nav) + (100% - var(--nav)) * ${(y / POSTER_H).toFixed(5)})`;
const bandTop = (i: number) => BAND_START + BAND_H * i;

function buildPhotoClip(): string {
  const pts: string[] = ['0 0', `${pctX(BAND_EDGES[0])} 0`];
  BAND_EDGES.forEach((edge, i) => {
    if (i > 0) {
      const y = posY(bandTop(i));
      pts.push(`${pctX(BAND_EDGES[i - 1])} ${y}`, `${pctX(edge)} ${y}`);
    }
  });
  pts.push(`${pctX(BAND_EDGES[BAND_EDGES.length - 1])} 100%`, '0 100%');
  return `polygon(${pts.join(', ')})`;
}

function buildTornPath(): string {
  // Deterministic PRNG so the edge is identical on every render.
  let seed = 26;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647 - 0.5;
  };
  const cmds: string[] = [`M0,${POSTER_H}`];
  for (let x = 0; x <= POSTER_W; x += 2.5) {
    const k = TORN_KEYPOINTS.findIndex(([kx]) => kx >= x);
    const [x1, y1] = TORN_KEYPOINTS[Math.max(k, 1) - 1];
    const [x2, y2] = TORN_KEYPOINTS[Math.max(k, 1)];
    const y = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1) + rand() * 1.1;
    cmds.push(`L${x},${Math.min(y, POSTER_H - 1).toFixed(1)}`);
  }
  cmds.push(`L${POSTER_W},${POSTER_H}`, 'Z');
  return cmds.join(' ');
}

const PHOTO_CLIP = buildPhotoClip();
const TORN_PATH = buildTornPath();

const DISPLAY_FONT: CSSProperties = {
  fontFamily: "'Imbue', 'Bodoni Moda', Georgia, serif",
  color: RED,
};

export default function HeroSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as Partial<HeroConfig>;
  const ctaHref = cfg.cta_href || '/shop';

  return (
    <section
      className="relative w-full h-[calc(56px+100vw)] md:h-screen md:min-h-[600px] overflow-hidden select-none [container-type:size] bg-[#F7F7F5] [--nav:56px] md:[--nav:62px]"
      aria-label="VAULT 26 — Online Store"
    >
      {/* Crumpled paper */}
      <img
        src={PAPER_SRC}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Photo with stepped, torn right edge */}
      <div className="absolute inset-0" style={{ clipPath: PHOTO_CLIP }}>
        <img
          src={PHOTO_SRC}
          alt="VAULT 26 editorial campaign"
          className="absolute left-0 top-0 h-full object-cover object-[50%_30%] grayscale contrast-[1.08]"
          style={{ width: pctX(600) }}
        />
      </div>

      {/* Stepped labels */}
      {LABELS.map(({ band, text }) => (
        <span
          key={text}
          className="absolute flex items-center bg-[#FCFCFA] px-[0.42cqw] whitespace-nowrap uppercase leading-none text-[#141414] text-[max(8px,2.3cqw)] md:text-[min(1.45cqw,calc((100cqh-62px)*0.0245))]"
          style={{
            left: pctX(BAND_EDGES[band]),
            top: posY(bandTop(band)),
            height: `calc((100% - var(--nav)) * ${(BAND_H / POSTER_H).toFixed(5)})`,
            fontFamily: "'Lato', 'Inter', sans-serif",
          }}
        >
          {text}
        </span>
      ))}

      {/* Title block */}
      <div
        className="absolute text-right"
        style={{ right: pctX(POSTER_W - 913), top: posY(0) }}
      >
        <p
          className="uppercase leading-none font-[800] tracking-[0.06em] text-[5.2cqw] md:text-[4.35cqw]"
          style={DISPLAY_FONT}
        >
          Online Store
        </p>
        <h1
          className="uppercase leading-none font-[800] mt-[0.9cqw] text-[10.4cqw] md:text-[11.1cqw]"
          style={DISPLAY_FONT}
        >
          Vault 26
        </h1>
      </div>

      {/* Bottom-right line — on desktop kept clear of the floating WhatsApp button */}
      <a
        href={ctaHref}
        className="absolute uppercase leading-none font-[800] text-[3.4cqw] md:text-[3.1cqw] bottom-[calc((100%-var(--nav))*0.078)] md:bottom-[max(calc((100%-var(--nav))*0.078),100px)] hover:opacity-80 transition-opacity"
        style={{ ...DISPLAY_FONT, right: pctX(POSTER_W - 912) }}
      >
        Shop Collection 2026
      </a>

      {/* Torn black bottom edge */}
      <svg
        aria-hidden="true"
        className="absolute left-0 bottom-0 w-full pointer-events-none"
        style={{ height: `calc((100% - var(--nav)) * ${((POSTER_H - TORN_TOP) / POSTER_H).toFixed(5)})` }}
        viewBox={`0 ${TORN_TOP} ${POSTER_W} ${POSTER_H - TORN_TOP}`}
        preserveAspectRatio="none"
      >
        <path d={TORN_PATH} fill="#0E0E0E" />
      </svg>
    </section>
  );
}
