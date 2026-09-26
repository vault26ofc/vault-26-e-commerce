import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight, ShoppingBasket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CMSSection } from '../types';
import { useShopProducts } from '@/components/polka/useShopProducts';
import { TornEdge, Wrap } from '@/components/polka/Polka';
import { inr } from '@/lib/format';

type Pick = {
  id: string;
  name: string;
  handle: string | null;
  video_source: 'upload' | 'link';
  video_url: string | null;
  link_url: string | null;
  thumbnail_url: string | null;
  thumbnail_type: 'image' | 'video';
  quote: string | null;
};

const SLIDE = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=800`;
// Extra frames so the phone always has a reel to cycle through.
const REEL_FILL = [
  SLIDE('photo-1529139574466-a303027c1d8b'),
  SLIDE('photo-1488161628813-04466f872be2'),
  SLIDE('photo-1503342217505-b0a15ec3261c'),
  SLIDE('photo-1520975954732-35dd22299614'),
];

/** Auto-advancing photo slider inside the phone: slides in from the right, dots at the top. */
function PhoneSlider({ pick, frames }: { pick: Pick; frames: string[] }) {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0); // manual steps restart the auto-advance timer
  useEffect(() => {
    if (tick === 0) setI(0);
    const t = setInterval(() => setI((n) => (n + 1) % frames.length), 3800);
    return () => clearInterval(t);
  }, [pick.id, frames.length, tick]);
  const step = (d: number) => { setI((n) => (n + d + frames.length) % frames.length); setTick((t) => t + 1); };
  return (
    <>
      <button onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 bg-[#BB0006] text-white flex items-center justify-center hover:bg-[#AA0001]">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={() => step(1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 bg-[#BB0006] text-white flex items-center justify-center hover:bg-[#AA0001]">
        <ChevronRight className="w-5 h-5" />
      </button>
      <AnimatePresence initial={false}>
        <motion.div
          key={`${pick.id}-${i}`}
          initial={{ x: '100%' }}
          animate={{ x: '0%' }}
          exit={{ x: '-30%', opacity: 0.4 }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          className="absolute inset-0"
        >
          {i === 0 ? <Media pick={pick} /> : <img src={frames[i]} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        </motion.div>
      </AnimatePresence>
      <div className="absolute top-10 left-3 right-3 z-20 flex gap-1">
        {frames.map((_, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} className="flex-1 h-[3px] bg-white/40 overflow-hidden">
            <span className={`block h-full bg-white transition-[width] ${k < i ? 'w-full duration-0' : k === i ? 'w-full duration-[3800ms] ease-linear' : 'w-0 duration-0'}`} />
          </button>
        ))}
      </div>
    </>
  );
}

function Media({ pick }: { pick: Pick }) {
  if (pick.video_source === 'upload' && pick.video_url) {
    return <video src={pick.video_url} autoPlay muted loop playsInline poster={pick.thumbnail_url || undefined} className="absolute inset-0 w-full h-full object-cover" />;
  }
  if (pick.thumbnail_type === 'video' && pick.thumbnail_url) {
    return <video src={pick.thumbnail_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />;
  }
  return <img src={pick.thumbnail_url || ''} alt={pick.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />;
}

/*
 * Styled by, on crumpled paper: the title runs as a giant red scroll-driven
 * marquee behind a phone-shaped creator frame. Quote on the left, the pieces
 * they wear as numbered shoppable cards on the right.
 */
export default function InfluencerPicksSection({ section }: { section?: CMSSection }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [active, setActive] = useState(0);
  const heading = section?.config?.heading || 'STYLED BY';
  const subtitle = section?.config?.subtitle || 'INFLUENCER PICKS';
  const products = useShopProducts(12);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const rowA = useTransform(scrollYProgress, [0, 1], ['0%', '-40%']);
  const rowB = useTransform(scrollYProgress, [0, 1], ['-40%', '0%']);

  useEffect(() => {
    supabase
      .from('influencer_picks' as any)
      .select('id, name, handle, video_source, video_url, link_url, thumbnail_url, thumbnail_type, quote')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setPicks((data as unknown as Pick[]) || []));
  }, []);

  if (!picks.length) return null;

  const pick = picks[active % picks.length];
  const offset = (active * 3) % Math.max(products.length, 1);
  const edit = [...products.slice(offset), ...products.slice(0, offset)].slice(0, 3);
  const go = (d: number) => setActive((n) => (n + d + picks.length) % picks.length);
  const marquee = `${heading} · ${pick.name} · `.repeat(6);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#F4F4F2]">
      <img src="/hero_paper_texture.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      <TornEdge color="#FFFFFF" position="top" seed={141} />

      {/* Giant marquee rows behind */}
      <div aria-hidden="true" className="absolute inset-x-0 top-[clamp(40px,5vw,80px)] flex flex-col gap-[1vw] pointer-events-none select-none">
        <motion.p style={{ x: rowA }} className="font-display font-[800] uppercase text-[#BB0006] whitespace-nowrap leading-[0.8] text-[clamp(110px,16vw,260px)]">
          {marquee}
        </motion.p>
        <motion.p style={{ x: rowB }} className="font-display font-[800] uppercase whitespace-nowrap leading-[0.8] text-[clamp(110px,16vw,260px)] text-transparent [-webkit-text-stroke:2px_#BB0006]">
          {marquee}
        </motion.p>
      </div>

      <Wrap className="relative z-[3] py-[clamp(80px,9vw,130px)] grid lg:grid-cols-[1fr_auto_1fr] gap-8 lg:gap-12 items-center">
        {/* Quote */}
        <div className="bg-white/90 p-5 md:p-6 self-start lg:self-center">
          <p className="font-sans uppercase text-[13px] text-[#0F0F0F]/60">{subtitle}</p>
          <p className="font-display font-[800] uppercase text-[#BB0006] text-[44px] md:text-[56px] leading-[0.85] mt-1">{heading}</p>
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={pick.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="font-sans text-[#0F0F0F] text-[17px] md:text-[19px] leading-relaxed mt-5"
            >
              “{pick.quote || 'Pieces I actually live in — cut well, built to last.'}”
              <footer className="mt-4 font-sans text-[14px]">
                <span className="font-bold">{pick.name}</span>
                {pick.handle && <span className="text-[#BB0006]"> · {pick.handle}</span>}
              </footer>
            </motion.blockquote>
          </AnimatePresence>
          <div className="mt-6 flex items-center justify-between">
            {picks.length > 1 ? (
              <div className="flex gap-2">
                <button onClick={() => go(-1)} aria-label="Previous creator" className="w-9 h-9 bg-[#BB0006] text-white flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => go(1)} aria-label="Next creator" className="w-9 h-9 bg-[#BB0006] text-white flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
              </div>
            ) : <span />}
            {pick.link_url && (
              <a href={pick.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-sans uppercase text-[13px] text-[#BB0006] underline underline-offset-4">
                Watch <ArrowUpRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Phone frame */}
        <div className="mx-auto w-[260px] md:w-[300px] bg-[#0F0F0F] p-[9px] rounded-[40px] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="relative aspect-[9/19] rounded-[32px] overflow-hidden bg-[#1A1A1A]">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[34%] h-[22px] bg-[#0F0F0F] rounded-full z-20" />
            <PhoneSlider pick={pick} frames={[pick.thumbnail_url || '', ...edit.map((p) => p.images[0]), ...REEL_FILL].slice(0, 6)} />
            <div className="absolute left-3 right-3 bottom-4 z-10 bg-[#BB0006] text-white px-3 py-2 font-sans text-[13px]">
              {pick.handle || pick.name} is wearing {edit.length} pieces
            </div>
          </div>
        </div>

        {/* Their pieces */}
        <ol className="space-y-3">
          {edit.map((p, i) => (
            <motion.li
              key={`${pick.id}-${p.id}`}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Link to={`/products/${p.slug}`} className="group flex items-center gap-4 bg-white p-3 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition-shadow">
                <span className="font-display font-[800] text-[#BB0006] text-[26px] w-8">{String(i + 1).padStart(2, '0')}</span>
                <div className="w-20 h-24 bg-[#F1F1F1] overflow-hidden shrink-0">
                  <img src={p.images[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="min-w-0 flex-1 font-sans">
                  <p className="text-[14px] md:text-[15px] text-[#0F0F0F] truncate">{p.name}</p>
                  <p className="text-[15px] font-bold text-[#0F0F0F]">{inr(p.price)}</p>
                </div>
                <span className="w-9 h-9 border border-[#BB0006] text-[#BB0006] flex items-center justify-center group-hover:bg-[#BB0006] group-hover:text-white transition-colors shrink-0">
                  <ShoppingBasket className="w-[18px] h-[18px]" strokeWidth={1.6} />
                </span>
              </Link>
            </motion.li>
          ))}
          <li>
            <Link to="/shop" className="flex h-12 items-center justify-center bg-[#BB0006] text-white font-sans text-[15px] hover:bg-[#AA0001] transition-colors">
              Shop the full edit
            </Link>
          </li>
        </ol>
      </Wrap>
      <TornEdge color="#FFFFFF" position="bottom" seed={143} />
    </section>
  );
}
