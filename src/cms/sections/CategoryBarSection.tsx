import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { CMSSection } from '../types';
import { resolveHref, type LinkValue } from '@/lib/links';
import { useCategoryNames } from '../lib/useCategoryNames';

export interface CategoryBarItem {
  slug?: string;
  /** picked in the admin (category slug) */
  category?: string;
  title?: string;
  image: string;
  href?: string;
}

const DEFAULT_CATEGORY_ITEMS: CategoryBarItem[] = [
  {
    slug: 'jackets',
    title: 'JACKETS',
    image: '/camo_zip_up_hoodie.png',
    href: '/shop?category=jackets',
  },
  {
    slug: 'sweaters',
    title: 'SWEATERS',
    image: '/off_white_knit_sweater.png',
    href: '/shop?category=sweaters',
  },
  {
    slug: 't-shirts',
    title: 'T-SHIRTS',
    image: '/black_camo_tshirt.png',
    href: '/shop?category=t-shirts',
  },
  {
    slug: 'shorts',
    title: 'SHORTS',
    image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=240',
    href: '/shop?category=shorts',
  },
  {
    slug: 'knitwear',
    title: 'KNITWEAR',
    image: '/off_white_knit_sweater.png',
    href: '/shop?category=knitwear',
  },
  {
    slug: 'jeans',
    title: 'JEANS',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=240',
    href: '/shop?category=jeans',
  },
  {
    slug: 'shirts',
    title: 'SHIRTS',
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=240',
    href: '/shop?category=shirts',
  },
  {
    slug: 'trousers',
    title: 'TROUSERS',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=240',
    href: '/shop?category=trousers',
  },
];

export default function CategoryBarSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as { categories?: CategoryBarItem[]; all_label?: string; all_link?: LinkValue };
  const names = useCategoryNames();
  const source = Array.isArray(cfg.categories) && cfg.categories.length > 0 ? cfg.categories : DEFAULT_CATEGORY_ITEMS;
  const categories = source.map((c, i) => ({
    key: c.category || c.slug || String(i),
    title: c.title || (c.category ? names[c.category] : '') || c.slug || '',
    image: c.image,
    href: c.category ? `/category/${c.category}` : c.href || '/shop',
  }));

  return (
    <section className="bg-white w-full pt-10 md:pt-14 relative">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-[30px]">
        <div className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide md:grid md:overflow-visible"
          style={{ gridTemplateColumns: `repeat(${Math.min(categories.length + 1, 9)}, minmax(0, 1fr))` }}>
          <Link
            to={resolveHref(cfg.all_link, '/shop')}
            className="shrink-0 h-11 md:h-12 px-5 flex items-center justify-center bg-[#BB0006] border border-[#BB0006] text-white font-sans text-[14px] md:text-[15px] whitespace-nowrap"
          >
            {cfg.all_label || 'Shop all'}
          </Link>
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
                <img src={cat.image} alt="" loading="lazy" className="w-6 h-6 object-cover mix-blend-multiply shrink-0" />
                <span className="lowercase first-letter:uppercase">{cat.title}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
