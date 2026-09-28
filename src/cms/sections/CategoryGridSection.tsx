import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CMSSection, CategoryGridConfig, CategoryItem } from '../types';
import { Num, Wrap } from '@/components/polka/Polka';
import { cn } from '@/lib/utils';
import { resolveHref, type LinkValue } from '@/lib/links';
import { Media, MotionMedia } from '@/components/shared/Media';

export interface NorseCategoryItem extends CategoryItem {
  seasonTag?: string;
  subtitle?: string;
  isFullWidth?: boolean;
}

const DEFAULT_CATEGORIES: NorseCategoryItem[] = [
  {
    slug: 'outerwear',
    title: 'OUTERWEAR & JACKETS',
    subtitle: 'Heavyweight jackets & technical coats',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=95&w=1200',
    href: '/shop?category=jackets'
  },
  {
    slug: 'knitwear',
    title: 'SWEATERS & KNITWEAR',
    subtitle: 'Italian wool & relaxed linen knits',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=95&w=1200',
    href: '/shop?category=sweaters'
  },
  {
    slug: 'sneakers',
    title: 'SNEAKERS & FOOTWEAR',
    subtitle: 'Minimalist leather trainers & studio sneakers',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=95&w=2000',
    href: '/shop?category=shoes',
  }
];

type Row = { key: string; title: string; subtitle?: string; image: string; href: string };

/*
 * Polka “Библиотека” block: oversized ink title with two floating product
 * tiles, then a numbered category list whose open row turns Editor's Red.
 */
export default function CategoryGridSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as CategoryGridConfig & {
    heading?: string; items?: { category?: string; subtitle?: string; image?: string }[];
    button_label?: string; bottom_label?: string; bottom_link?: LinkValue; limit?: number;
  };
  const picked = (cfg.items || []).filter((it) => it.category);
  const cfgCats: NorseCategoryItem[] =
    Array.isArray(cfg.categories) && cfg.categories.length > 0 ? (cfg.categories as NorseCategoryItem[]) : DEFAULT_CATEGORIES;

  const [rows, setRows] = useState<Row[]>(() =>
    cfgCats.map((c, i) => ({ key: c.slug || String(i), title: c.title, subtitle: c.subtitle, image: c.image, href: c.href || '/shop' })),
  );
  const [open, setOpen] = useState<number | null>(null);

  // Prefer the live catalogue categories; imagery comes from the CMS list.
  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, slug')
      .order('name')
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        if (picked.length) {
          // Admin-picked categories, in the admin's order.
          const bySlug = new Map(data.map((c: any) => [c.slug, c]));
          setRows(picked.map((it, i) => {
            const c: any = bySlug.get(it.category!);
            return c && { key: c.id, title: c.name, subtitle: it.subtitle, image: it.image || cfgCats[i % cfgCats.length]?.image, href: `/category/${c.slug}` };
          }).filter(Boolean) as Row[]);
          return;
        }
        setRows(
          data.slice(0, Number(cfg.limit) || 7).map((c: any, i: number) => ({
            key: c.id,
            title: c.name,
            subtitle: cfgCats[i % cfgCats.length]?.subtitle,
            image: cfgCats[i % cfgCats.length]?.image,
            href: `/category/${c.slug}`,
          })),
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const floatA = rows[0]?.image;
  const floatB = rows[1]?.image;

  return (
    <section className="bg-white py-14 md:py-24 overflow-hidden">
      <Wrap>
        {/* Oversized title with floating tiles */}
        <div className="relative">
          <h2 className="font-display font-[800] uppercase text-[#0F0F0F] leading-[0.82] text-center text-[clamp(64px,15.4vw,222px)] tracking-[-0.01em]">
            {cfg.heading || 'Categories'}
          </h2>
          {floatA && (
            <MotionMedia
              src={floatA}
              alt=""
              aria-hidden="true"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.8, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
              className="absolute left-[53%] -top-[6%] w-[9%] aspect-[3/4] object-cover shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
            />
          )}
          {floatB && (
            <MotionMedia
              src={floatB}
              alt=""
              aria-hidden="true"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 0.8, delay: 0.15, y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
              className="absolute right-[4%] top-[42%] w-[9%] aspect-[3/4] object-cover shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
            />
          )}
        </div>

        {/* Numbered accordion */}
        <ul className="mt-4 md:mt-6 border-t border-[#0F0F0F]/40">
          {rows.map((row, i) => {
            const active = open === i;
            return (
              <li key={row.key} className="border-b border-[#0F0F0F]/40">
                <button
                  onClick={() => setOpen(active ? null : i)}
                  aria-expanded={active}
                  className={cn(
                    'w-full h-12 md:h-[54px] grid grid-cols-[48px_1fr_48px] md:grid-cols-[80px_1fr_80px] items-center px-3 transition-colors',
                    active ? 'bg-[#BB0006] text-white' : 'text-[#0F0F0F]/60 hover:text-[#0F0F0F]',
                  )}
                >
                  <Num n={i + 1} className={cn('text-left text-[20px] md:text-[24px]', active ? 'text-white' : 'text-[#0F0F0F]/50')} />
                  <span className={cn('font-sans uppercase text-[14px] md:text-[18px] tracking-wide truncate', active && 'font-bold')}>
                    {row.title}
                  </span>
                  <ChevronDown className={cn('justify-self-end w-5 h-5 transition-transform', active ? 'rotate-180' : '-rotate-90')} strokeWidth={1.6} />
                </button>
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid md:grid-cols-[1fr_2fr] gap-6 py-6 px-3">
                        <Media src={row.image} alt={row.title} loading="lazy" className="w-full aspect-[4/3] object-cover grayscale" />
                        <div className="flex flex-col justify-between gap-6">
                          <p className="font-sans text-[15px] md:text-[17px] text-[#0F0F0F] max-w-[520px] leading-relaxed">
                            {row.subtitle || 'Pieces from the archive, cut to be worn for years.'}
                          </p>
                          <Link to={row.href} className="self-start h-12 px-8 bg-[#BB0006] text-white font-sans text-[15px] flex items-center hover:bg-[#AA0001] transition-colors">
                            {cfg.button_label ? `${cfg.button_label} ${row.title.toLowerCase()}` : `Shop ${row.title.toLowerCase()}`}
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>

        <div className="text-center mt-6">
          <Link to={resolveHref(cfg.bottom_link, '/shop')} className="font-sans text-[13px] md:text-[14px] uppercase text-[#BB0006] underline underline-offset-4">
            {cfg.bottom_label || 'Go to catalogue'}
          </Link>
        </div>
      </Wrap>
    </section>
  );
}
