import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { CMSSection, CategoryGridConfig, CategoryItem } from '../types';

export interface NorseCategoryItem extends CategoryItem {
  seasonTag?: string;
  subtitle?: string;
  isFullWidth?: boolean;
}

const DEFAULT_CATEGORIES: NorseCategoryItem[] = [
  {
    slug: 'outerwear',
    title: 'OUTERWEAR & JACKETS',
    seasonTag: 'Autumn/Winter 26',
    subtitle: 'Heavyweight jackets & technical coats',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=95&w=1200',
    href: '/shop?category=jackets'
  },
  {
    slug: 'knitwear',
    title: 'SWEATERS & KNITWEAR',
    seasonTag: 'Core Archive',
    subtitle: 'Italian wool & relaxed linen knits',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=95&w=1200',
    href: '/shop?category=sweaters'
  },
  {
    slug: 'sneakers',
    title: 'SNEAKERS & FOOTWEAR',
    seasonTag: 'Handcrafted Atelier 26',
    subtitle: 'Minimalist leather trainers & studio sneakers',
    image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=95&w=2000',
    href: '/shop?category=shoes',
    isFullWidth: true
  }
];

export default function CategoryGridSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as CategoryGridConfig;
  const categories: NorseCategoryItem[] =
    Array.isArray(cfg.categories) && cfg.categories.length > 0
      ? (cfg.categories as NorseCategoryItem[])
      : DEFAULT_CATEGORIES;

  // Split into Top (first 2) and Middle Full-Width (Sneakers/Footwear)
  const topCategories = categories.slice(0, 2);
  
  // Find full-width item or default to index 2
  const fullWidthIndex = categories.findIndex((c) => c.isFullWidth || c.slug === 'sneakers' || c.slug === 'shoes');
  const fullWidthCat = fullWidthIndex !== -1 ? categories[fullWidthIndex] : (categories[2] || DEFAULT_CATEGORIES[2]);

  return (
    <section className="py-10 md:py-16 bg-white text-black font-sans w-full border-t border-black/5 overflow-hidden">
      {/* Section Header */}
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12 mb-6 md:mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-[0.2em] text-black/50 uppercase block mb-1">
              CATEGORIES
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-sans font-bold uppercase tracking-tight text-black leading-none">
              SHOP BY SILHOUETTE
            </h2>
          </div>
          <Link
            to="/shop"
            className="text-xs font-bold tracking-[0.2em] uppercase text-black border-b-2 border-black pb-1 hover:text-black/60 hover:border-black/60 transition-colors inline-block w-fit"
          >
            DISCOVER ALL CATEGORIES →
          </Link>
        </div>
      </div>

      {/* 1. TOP ROW: 100% Full Edge-to-Edge 2-Column Grid */}
      <div className="w-full px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 sm:gap-2">
          {topCategories.map((cat, i) => (
            <CategoryCard key={cat.slug || i} cat={cat} delay={i * 0.08} />
          ))}
        </div>
      </div>

      {/* 2. FULL VIEWPORT WIDTH (100vw Edge-to-Edge) Sneakers Banner Card */}
      {fullWidthCat && (
        <div className="w-full mt-1.5 sm:mt-2 px-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="w-full group relative"
          >
            <Link to={fullWidthCat.href || '/shop'} className="block w-full relative overflow-hidden group">
              <div className="relative w-full h-[450px] sm:h-[550px] md:h-[620px] lg:h-[700px] bg-[#F2F2F2] overflow-hidden rounded-none">
                <img
                  src={fullWidthCat.image}
                  alt={fullWidthCat.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
                {/* Vignette Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/25 group-hover:from-black/90 transition-all duration-500" />

                {/* Top-Left Season Tag in Allura Script */}
                <div className="absolute top-6 left-6 sm:top-10 sm:left-12 md:left-16 z-10 pointer-events-none">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-secondary font-normal text-amber-100/95 drop-shadow-md tracking-normal capitalize">
                    {fullWidthCat.seasonTag || 'Handcrafted Atelier 26'}
                  </span>
                </div>

                {/* Bottom Title Content Overlay */}
                <div className="absolute bottom-8 left-6 right-6 sm:bottom-12 sm:left-12 sm:right-12 md:left-16 md:right-16 z-10 text-white flex flex-col gap-1.5 pointer-events-none">
                  <h3 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-primary font-bold uppercase tracking-tight text-white drop-shadow-md group-hover:translate-x-1 transition-transform duration-300">
                    {fullWidthCat.title}
                  </h3>
                  {fullWidthCat.subtitle && (
                    <p className="text-xs sm:text-sm md:text-base text-white/85 font-normal tracking-wide hidden sm:block">
                      {fullWidthCat.subtitle}
                    </p>
                  )}
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-white border-b border-white pb-0.5 group-hover:border-white/70 transition-colors">
                      EXPLORE FOOTWEAR
                    </span>
                    <span className="text-xs sm:text-sm text-white group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      )}
    </section>
  );
}

function CategoryCard({ cat, delay }: { cat: NorseCategoryItem; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="group relative w-full flex flex-col"
    >
      <Link to={cat.href} className="block w-full h-full relative overflow-hidden group">
        <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] bg-[#F2F2F2] overflow-hidden rounded-none">
          <img
            src={cat.image}
            alt={cat.title}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25 group-hover:from-black/85 transition-all duration-500" />

          <div className="absolute top-5 left-5 sm:top-8 sm:left-8 z-10 pointer-events-none">
            <span className="text-xl sm:text-2xl md:text-3xl font-secondary font-normal text-amber-100/95 drop-shadow-md tracking-normal capitalize">
              {cat.seasonTag || 'Autumn/Winter 26'}
            </span>
          </div>

          <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8 z-10 text-white flex flex-col gap-1.5 pointer-events-none">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-primary font-bold uppercase tracking-tight text-white drop-shadow-md group-hover:translate-x-1 transition-transform duration-300">
              {cat.title}
            </h3>
            {cat.subtitle && (
              <p className="text-xs sm:text-sm text-white/85 font-normal tracking-wide hidden sm:block">
                {cat.subtitle}
              </p>
            )}
            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-white border-b border-white pb-0.5 group-hover:border-white/70 transition-colors">
                EXPLORE CATEGORY
              </span>
              <span className="text-xs sm:text-sm text-white group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
