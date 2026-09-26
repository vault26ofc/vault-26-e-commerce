import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CMSSection } from '../types';
import { TornEdge } from '@/components/polka/Polka';

type Photo = {
  id: string;
  image_url: string;
  media_type: 'image' | 'video';
  handle: string | null;
  bento_size: 'sm' | 'md' | 'lg' | 'wide' | 'tall';
};

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=900`;

// Community fill keeps the wall full until enough customer photos are uploaded.
const FILL: Photo[] = [
  { id: 'cf-1', image_url: U('photo-1529139574466-a303027c1d8b'), media_type: 'image', handle: '@studio.notes', bento_size: 'sm' },
  { id: 'cf-2', image_url: U('photo-1506794778202-cad84cf45f1d'), media_type: 'image', handle: '@archive.fits', bento_size: 'sm' },
  { id: 'cf-3', image_url: U('photo-1539109136881-3be0616acf4b'), media_type: 'image', handle: '@worn.daily', bento_size: 'sm' },
  { id: 'cf-4', image_url: U('photo-1503342217505-b0a15ec3261c'), media_type: 'image', handle: '@city.layers', bento_size: 'sm' },
  { id: 'cf-5', image_url: U('photo-1485968579580-b6d095142e6e'), media_type: 'image', handle: '@rotation.club', bento_size: 'sm' },
  { id: 'cf-6', image_url: U('photo-1520975954732-35dd22299614'), media_type: 'image', handle: '@late.edition', bento_size: 'sm' },
];

/*
 * Community, zoom-through type: pinned for two screens. A full-screen Editor's
 * Red sheet has the heading cut out of it (SVG mask), so the photo wall shows
 * through the letters. Scrolling zooms into the type until the sheet falls
 * away and the wall — with handles and a CTA — is fully revealed.
 */
export default function CommunitySection({ section }: { section?: CMSSection }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const heading = section?.config?.heading || 'WORN BY VAULT 26';
  const subtitle = section?.config?.subtitle || 'FROM THE COMMUNITY';
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const sheetScale = useTransform(scrollYProgress, [0.3, 0.7], [1, 6], { ease: (t) => t * t });
  const sheetOpacity = useTransform(scrollYProgress, [0.56, 0.7], [1, 0]);
  const tileOpacity = useTransform(scrollYProgress, [0.7, 0.8], [0, 1]);
  const wallScale = useTransform(scrollYProgress, [0.3, 0.74], [1.15, 1]);

  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    supabase
      .from('community_photos' as any)
      .select('id, image_url, media_type, handle, bento_size')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setPhotos((data as unknown as Photo[]) || []));
  }, []);

  const wall = [...photos, ...FILL].slice(0, 6);

  return (
    <section ref={ref} className="relative bg-[#0F0F0F] h-[320vh] overflow-clip">
      <TornEdge color="#FFFFFF" position="top" seed={121} />
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Revealed board: paper, gutters, red title tile + uneven photo tiles */}
        <motion.div style={{ scale: wallScale }} className="absolute inset-0 bg-[#F4F4F2]">
          <img src="/hero_paper_texture.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
          <div className="relative h-full mx-auto max-w-[1440px] px-4 md:px-8 lg:px-[30px] pt-[80px] md:pt-[90px] pb-6 grid grid-cols-2 md:grid-cols-4 grid-rows-3 md:grid-rows-2 gap-3 md:gap-4">
            <div className="relative col-span-2 md:col-span-1 md:row-span-2 text-white overflow-hidden bg-[#0F0F0F]">
              {/* Photo behind the tile while the type is readable; the red tile fades in after the reveal */}
              {wall[5] && <img src={wall[5].image_url} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.1]" />}
              <motion.div style={{ opacity: tileOpacity }} className="absolute inset-0 bg-[#BB0006] p-5 md:p-6 flex flex-col justify-between">
              <p className="font-sans uppercase text-[13px] text-white/85">{subtitle}</p>
              <div>
                <p className="font-display font-[800] uppercase leading-[0.85] text-[clamp(44px,5.2vw,84px)]">{heading}</p>
                <p className="font-sans text-[14px] md:text-[15px] leading-relaxed mt-4 text-white/90">
                  Real people, real rotation. Tag us and your fit could be the next frame on this wall.
                </p>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex h-11 px-5 items-center gap-2 bg-white text-[#BB0006] font-sans text-[14px] hover:bg-[#F1F1F1] transition-colors"
                >
                  <Instagram className="w-4 h-4" /> Tag @vault26
                </a>
              </div>
              </motion.div>
            </div>
            {wall.slice(0, 5).map((p, i) => (
              <figure key={p.id} className={`relative overflow-hidden bg-[#0F0F0F] ${i === 0 ? 'md:row-span-2' : ''} ${i === 4 ? 'hidden md:block' : ''}`}>
                {p.media_type === 'video' ? (
                  <video src={p.image_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover grayscale" />
                ) : (
                  <img src={p.image_url} alt={p.handle || 'Community photo'} loading="lazy" className="absolute inset-0 w-full h-full object-cover grayscale contrast-[1.1] hover:grayscale-0 transition-[filter] duration-700" />
                )}
                <figcaption className="absolute left-0 bottom-0 bg-[#BB0006] text-white font-sans text-[13px] px-2.5 py-1">
                  {p.handle || '@vault26'}
                </figcaption>
                <span className="absolute right-2 top-2 font-display font-[800] text-white text-[20px] leading-none drop-shadow">{String(i + 1).padStart(2, '0')}</span>
              </figure>
            ))}
          </div>
        </motion.div>

        {/* Red sheet with the heading cut out */}
        <motion.svg
          style={{ scale: sheetScale, opacity: sheetOpacity }}
          className="absolute inset-0 w-full h-full origin-[50%_52%] pointer-events-none [backface-visibility:hidden]"
          viewBox={narrow ? '0 0 900 1600' : '0 0 1600 900'}
          preserveAspectRatio="xMidYMid slice"
          aria-label={heading}
        >
          <defs>
            <mask id="community-cut">
              <rect width="1600" height="1600" fill="white" />
              {narrow ? (
                <>
                  <text x="450" y="560" textAnchor="middle" fontFamily="Imbue, 'Bodoni Moda', serif" fontWeight={800} fontSize="64" fill="black" letterSpacing="2">{subtitle}</text>
                  {heading.split(' ').reduce<string[]>((acc, w, i, all) => {
                    // Two words per line on phones.
                    if (i % 2 === 0) acc.push(all.slice(i, i + 2).join(' '));
                    return acc;
                  }, []).map((line, i) => (
                    <text key={i} x="450" y={760 + i * 210} textAnchor="middle" fontFamily="Imbue, 'Bodoni Moda', serif" fontWeight={800} fontSize="220" fill="black">{line}</text>
                  ))}
                </>
              ) : (
                <>
                  <text x="800" y="370" textAnchor="middle" fontFamily="Imbue, 'Bodoni Moda', serif" fontWeight={800} fontSize="84" fill="black" letterSpacing="2">{subtitle}</text>
                  <text x="800" y="600" textAnchor="middle" fontFamily="Imbue, 'Bodoni Moda', serif" fontWeight={800} fontSize="178" fill="black">{heading}</text>
                </>
              )}
            </mask>
          </defs>
          <rect width="1600" height="1600" fill="#BB0006" mask="url(#community-cut)" />
        </motion.svg>

      </div>
      <TornEdge color="#FFFFFF" position="bottom" seed={127} />
    </section>
  );
}
