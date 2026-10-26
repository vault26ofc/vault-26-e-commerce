import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, type MotionStyle, type MotionValue } from 'framer-motion';
import type { CMSSection } from '../types';
import { TextColumns } from '@/components/polka/Polka';
import { resolveHref, type LinkValue } from '@/lib/links';
import { isVideoUrl } from '@/lib/media';
import { imageProps } from '@/lib/image';
import { useIsPhone } from '@/components/shared/Media';

type Card = { title: string; kicker: string; href?: string; link?: LinkValue; image: string; image_mobile?: string; tone: 'red' | 'ink' | 'paper'; button_label?: string };

const TONES = {
  red: { bg: '#BB0006', ink: '#FFFFFF', btnBg: '#FFFFFF', btnInk: '#BB0006' },
  ink: { bg: '#0F0F0F', ink: '#FFFFFF', btnBg: '#BB0006', btnInk: '#FFFFFF' },
  paper: { bg: '#F4F4F2', ink: '#BB0006', btnBg: '#BB0006', btnInk: '#FFFFFF' },
};

function StackCard({ card, i, n, progress }: { card: Card; i: number; n: number; progress: MotionValue<number> }) {
  const t = TONES[card.tone] ?? TONES.red;
  const start = i / n;
  // Earlier cards shrink back slightly as the next one covers them.
  const scale = useTransform(progress, [start, Math.min(1, start + 1 / n)], [1, i === n - 1 ? 1 : 0.95]);
  const imgY = useTransform(progress, [Math.max(0, start - 1 / n), start + 1 / n], ['-4%', '4%']);
  const wordX = useTransform(progress, [Math.max(0, start - 1 / n), start + 1 / n], ['4%', '-3%']);
  const phone = useIsPhone();
  // Optional phone-only photo/video; empty = phones use the normal one.
  const image = (phone && card.image_mobile) || card.image;

  return (
    // Below lg the bottom tab bar (72px) covers the screen's foot, so the card stops above it.
    <div className="sticky top-[56px] md:top-[62px] h-[calc(100svh-56px-72px)] md:h-[calc(100svh-62px-72px)] lg:h-[calc(100vh-62px)]" style={{ zIndex: i + 1 }}>
      <motion.div style={{ scale, background: t.bg, color: t.ink }} className="relative h-full overflow-hidden origin-top">
        <TextColumns count={12} color={card.tone === 'paper' ? 'rgba(187,0,6,0.08)' : 'rgba(255,255,255,0.06)'} className="absolute inset-0" />

        {/* Giant word behind the photo; on phones sized to its length so long words fit the width */}
        <motion.p
          style={{ x: wordX, '--fit': `${(170 / Math.max(card.title.length, 1)).toFixed(2)}vw` } as MotionStyle}
          aria-hidden="true"
          className="absolute left-4 md:left-0 bottom-[6%] font-display font-[800] uppercase whitespace-nowrap leading-[0.78] text-[length:min(27vw,var(--fit))] md:text-[clamp(140px,26vw,420px)] pointer-events-none"
        >
          {card.title}
        </motion.p>

        {/* Photo panel */}
        <div className="absolute left-5 right-5 top-[26%] bottom-[20%] md:left-auto md:right-[4%] md:top-[8%] md:bottom-[8%] md:w-[38%] overflow-hidden">
          {isVideoUrl(image)
            ? <motion.video key={image} style={{ y: imgY }} src={image} autoPlay muted loop playsInline className="absolute inset-[-10%_0] w-full h-[120%] object-cover grayscale contrast-[1.1]" />
            : <motion.img style={{ y: imgY }} {...imageProps(image, { sizes: '(min-width: 768px) 40vw, 100vw' })} alt={card.title} className="absolute inset-[-10%_0] w-full h-[120%] object-cover grayscale contrast-[1.1]" />}
        </div>

        {/* Copy */}
        <div className="relative z-[2] h-full flex flex-col justify-start p-5 md:p-10 max-w-[92%] md:max-w-[46%]">
          <div className="flex items-center gap-4 font-sans uppercase text-[13px] md:text-[15px]">
            <span className="font-display font-[800] text-[22px] md:text-[28px]">{String(i + 1).padStart(2, '0')}</span>
            <span className="w-14 h-px" style={{ background: t.ink }} />
            {card.kicker}
          </div>
          <Link
            to={resolveHref(card.link ?? card.href, '/shop')}
            className="self-start mt-6 h-12 md:h-14 px-8 flex items-center font-sans text-[15px] md:text-[16px] transition-opacity hover:opacity-85"
            style={{ background: t.btnBg, color: t.btnInk }}
          >
            {card.button_label || `Shop ${card.title.toLowerCase()}`}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

/*
 * Full-screen category cards: Men, Women, Sneakers stack on top of each other
 * as you scroll — each pins, its photo and giant word drift, then the next
 * card slides over it.
 */
export default function CategoryCardsSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as { cards?: Card[] };
  const cards = (cfg.cards || []).filter((c) => c.title || c.image);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  if (!cards.length) return null;

  return (
    <section ref={ref} className="relative bg-white">
      {cards.map((c, i) => (
        <div key={`${c.title}-${i}`} className="contents">
          <StackCard card={c} i={i} n={cards.length} progress={scrollYProgress} />
          {/* Dwell: hold this card still for ~¾ screen so it can be read before the next arrives */}
          <div aria-hidden="true" className="h-[75vh]" />
        </div>
      ))}
    </section>
  );
}
