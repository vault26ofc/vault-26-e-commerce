import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { CMSSection, BentoGridConfig, BentoItem } from '../types';

const DEFAULT_ITEMS: BentoItem[] = [
  {
    id: 1,
    title: 'HEAVYWEIGHT BOX TEE V2.0',
    category: 'ESSENTIALS',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=90&w=800',
    href: '/products/heavyweight-box-tee',
    col_span: 1,
    row_span: 1
  },
  {
    id: 2,
    title: 'RAW SELVEDGE DENIM JACKET',
    category: 'OUTERWEAR',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=90&w=800',
    href: '/products/raw-selvedge-oversized-denim',
    col_span: 1,
    row_span: 1
  },
  {
    id: 3,
    title: 'ARCHITECTURAL FLEECE HOODIE',
    category: 'LIMITED EDITION',
    image: 'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=90&w=800',
    href: '/products/architectural-fleece-hoodie',
    col_span: 1,
    row_span: 1
  },
  {
    id: 4,
    title: 'OFF WHITE SHIELD KNIT SWEATER',
    category: 'KNITWEAR',
    image: '/off_white_knit_sweater.png',
    href: '/products/off-white-closed-shield-knit-sweater',
    col_span: 1,
    row_span: 1
  }
];

export default function BentoGridSection({ section }: { section: CMSSection }) {
  const cfg = section.config as BentoGridConfig;
  const items: BentoItem[] = Array.isArray(cfg.items) && cfg.items.length > 0 ? cfg.items : DEFAULT_ITEMS;

  return (
    <section className="py-10 md:py-14 bg-white text-black font-sans w-full border-t border-black/5">
      {/* Edge to Edge Container with Small Padding */}
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8">
        {/* Section Header (Daily Paper Style) */}
        <div className="mb-5 md:mb-7 text-left px-1">
          <h2 className="text-xl md:text-2xl font-sans font-bold uppercase tracking-wide text-black leading-tight">
            {cfg.heading || "EDITORIAL ARCHIVE"}
          </h2>
          <p className="text-xs md:text-sm font-sans font-normal uppercase text-black/80 tracking-wide mt-0.5">
            {cfg.eyebrow || "CURATED HIGHLIGHTS"}
          </p>
        </div>

        {/* Edge-to-Edge 4-Column Grid with Micro Gap Between Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3">
          {items.slice(0, 4).map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group flex flex-col w-full"
            >
              <Link to={item.href} className="block w-full">
                {/* Studio Light-Grey Image Container */}
                <div className="relative aspect-[3/4.2] bg-[#EFEFEF] overflow-hidden rounded-none border border-black/5 flex items-center justify-center p-6 sm:p-8">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain object-center transition-all duration-700 ease-out mix-blend-multiply group-hover:scale-105"
                  />

                  {/* Category Badge (Top Left Corner) */}
                  <div className="absolute top-3 left-3 z-10 pointer-events-none">
                    <span className="bg-white text-black text-[10px] sm:text-xs font-sans font-bold uppercase tracking-wider px-2 py-1 shadow-sm rounded-none border border-black/5">
                      {item.category || "ARCHIVE"}
                    </span>
                  </div>
                </div>

                {/* Details Below Image Container */}
                <div className="pt-2.5 px-0.5 flex flex-col gap-1 text-left font-sans">
                  <h3 className="text-xs sm:text-[13px] font-sans font-bold text-black tracking-wide uppercase leading-tight line-clamp-1 group-hover:text-[#B11226] transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between pt-0.5 font-sans">
                    <span className="text-xs sm:text-sm font-sans font-bold text-black uppercase">
                      VAULT 26 EDITORIAL
                    </span>
                    <span className="w-2.5 h-2.5 bg-[#8B5A2B] border border-black/10 rounded-none shrink-0" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Centered Outline CTA Button */}
        <div className="pt-10 md:pt-14 text-center">
          <Link
            to={cfg.cta_href || "/shop"}
            className="inline-block border border-black text-black hover:bg-black hover:text-white px-9 py-3.5 text-xs font-sans font-bold tracking-[0.2em] uppercase transition-all duration-300 rounded-none shadow-none cursor-pointer"
          >
            {cfg.cta_label || "EXPLORE ALL EDITIONS"}
          </Link>
        </div>
      </div>
    </section>
  );
}

