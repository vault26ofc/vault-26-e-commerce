import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { CMSSection } from '../types';

export interface CategoryBarItem {
  slug: string;
  title: string;
  image: string;
  href: string;
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
  const cfgItems = section?.config?.categories as CategoryBarItem[] | undefined;
  const categories = Array.isArray(cfgItems) && cfgItems.length > 0 ? cfgItems : DEFAULT_CATEGORY_ITEMS;

  return (
    <section className="bg-white w-full py-4 md:py-6 font-ui relative z-20">
      {/* Centered container with left & right side margins/padding matching Daily Paper design */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-16">
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <Link
                to={cat.href}
                className="group inline-flex items-center gap-2.5 bg-[#EDEDED] hover:bg-black transition-all duration-300 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-none shadow-none"
              >
                {/* Apparel Thumbnail Preview Container */}
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white flex items-center justify-center p-0.5 overflow-hidden shrink-0 rounded-none">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    loading="lazy"
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                  />
                </div>

                {/* Category Label */}
                <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.14em] uppercase text-black group-hover:text-white transition-colors duration-300 whitespace-nowrap">
                  {cat.title}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
