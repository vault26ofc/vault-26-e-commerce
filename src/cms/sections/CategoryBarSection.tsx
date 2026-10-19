import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { CMSSection } from '../types';
import { resolveHref, type LinkValue } from '@/lib/links';
import { useCategoryNames } from '../lib/useCategoryNames';
import { Media } from '@/components/shared/Media';

export interface CategoryBarItem {
  slug?: string;
  /** picked in the admin (category slug) */
  category?: string;
  title?: string;
  image: string;
  href?: string;
}

export default function CategoryBarSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as { categories?: CategoryBarItem[]; all_label?: string; all_link?: LinkValue };
  const names = useCategoryNames();
  const source = Array.isArray(cfg.categories) ? cfg.categories : [];
  const categories = source.map((c, i) => ({
    key: c.category || c.slug || String(i),
    title: c.title || (c.category ? names[c.category] : '') || c.slug || '',
    image: c.image,
    href: c.category ? `/category/${c.category}` : c.href || '/shop',
  })).filter((c) => c.title);

  if (!categories.length && !cfg.all_label) return null;

  return (
    <section className="bg-white w-full pt-10 md:pt-14 relative">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-[30px]">
        <div className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide md:grid md:overflow-visible"
          style={{ gridTemplateColumns: `repeat(${Math.min(categories.length + 1, 9)}, minmax(0, 1fr))` }}>
          {cfg.all_label && <Link
            to={resolveHref(cfg.all_link, '/shop')}
            className="shrink-0 h-11 md:h-12 px-5 flex items-center justify-center bg-[#BB0006] border border-[#BB0006] text-white font-sans text-[14px] md:text-[15px] whitespace-nowrap"
          >
            {cfg.all_label}
          </Link>}
          {categories.map((cat, i) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
              className="shrink-0"
            >
              <Link
                to={cat.href}
                className="group h-11 md:h-12 px-4 flex items-center justify-center gap-2 border border-[#0F0F0F] bg-white text-[#0F0F0F] hover:border-[#BB0006] hover:text-[#BB0006] transition-colors font-sans text-[14px] md:text-[15px] whitespace-nowrap"
              >
                {cat.image && <Media src={cat.image} alt="" loading="lazy" sizes="24px" maxWidth={320} className="w-6 h-6 object-cover mix-blend-multiply shrink-0" />}
                <span className="lowercase first-letter:uppercase">{cat.title}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
