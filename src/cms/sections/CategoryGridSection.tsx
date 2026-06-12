import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CMSSection, CategoryGridConfig, CategoryItem } from '../types';

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { slug: 'men', title: 'Menswear', image: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=1000', href: '/category/men', watermark: 'MEN' },
  { slug: 'shoes', title: 'Footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1000', href: '/category/shoes', watermark: 'KICKS' },
  { slug: 'accessories', title: 'Accessories', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1000', href: '/category/accessories', watermark: 'ACC', badge: 'New' },
];

export default function CategoryGridSection({ section }: { section: CMSSection }) {
  const cfg = section.config as CategoryGridConfig;
  const categories: CategoryItem[] = Array.isArray(cfg.categories) && cfg.categories.length > 0
    ? cfg.categories
    : DEFAULT_CATEGORIES;

  return (
    <section className="bg-white">
      <div className={`grid grid-cols-1 md:grid-cols-${Math.min(categories.length, 4)}`} style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, minmax(0, 1fr))` }}>
        {categories.map((cat, i) => (
          <motion.div
            key={cat.slug}
            id={cat.slug}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="group flex flex-col"
          >
            <Link to={cat.href} className="flex flex-col">
              <div className="relative overflow-hidden w-full h-[450px] md:h-[500px] lg:h-[700px] bg-muted">
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover grayscale transition-all duration-1500 ease-editorial group-hover:scale-[1.04] group-hover:grayscale-0"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <h3 className="text-[12vw] md:text-[8vw] font-light text-white/20 uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all duration-700 group-hover:text-white/40 group-hover:scale-110 font-elegant">
                    {cat.watermark || cat.slug.toUpperCase()}
                  </h3>
                </div>
                {cat.badge && (
                  <span className="absolute top-6 right-6 bg-accent text-white text-[9px] font-ui font-bold uppercase tracking-[0.2em] px-3 py-1.5">
                    {cat.badge}
                  </span>
                )}
              </div>
              <div className="mt-5 flex flex-col gap-0.5 px-6 pb-12">
                <h3 className="text-black text-4xl md:text-5xl lg:text-6xl tracking-tight mb-5 font-elegant font-light">
                  {cat.title}
                </h3>
                <span className="inline-flex items-center gap-2 w-fit border-b border-black/40 pb-1 text-[11px] tracking-[0.35em] uppercase font-bold font-ui text-black/80 group-hover:text-accent group-hover:border-accent transition-all duration-500">
                  Shop Collection <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
