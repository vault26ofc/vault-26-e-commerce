import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CMSSection, BentoGridConfig, BentoItem } from '../types';

function colRowClass(col: number, row: number) {
  const cols: Record<number, string> = { 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4' };
  const rows: Record<number, string> = { 2: 'md:row-span-2' };
  return [cols[col] ?? '', rows[row] ?? ''].filter(Boolean).join(' ');
}

const DEFAULT_ITEMS: BentoItem[] = [
  { id: 1, title: 'Menswear Edit', category: 'Archive 01', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800', href: '/category/men', col_span: 2, row_span: 2 },
  { id: 2, title: 'Raw Denim Kit', category: 'Essentials', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800', href: '/shop', col_span: 1, row_span: 1 },
  { id: 3, title: 'Silk Utility Shirt', category: 'Limited', image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=800', href: '/category/shirts', col_span: 1, row_span: 1 },
  { id: 4, title: 'Street Kicks', category: 'Footwear', image: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&q=80&w=800', href: '/category/shoes', col_span: 2, row_span: 1 },
];

export default function BentoGridSection({ section }: { section: CMSSection }) {
  const cfg = section.config as BentoGridConfig;
  const items: BentoItem[] = Array.isArray(cfg.items) && cfg.items.length > 0 ? cfg.items : DEFAULT_ITEMS;

  return (
    <section className="py-24 container-px bg-white">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <span className="eyebrow block mb-4">{cfg.eyebrow || 'The New Standard'}</span>
          <h2 className="display-2">
            {cfg.heading || 'Latest from the'} <span className="italic">{cfg.heading_italic || 'Archive.'}</span>
          </h2>
        </div>
        <Link
          to={cfg.cta_href || '/shop'}
          className="text-[11px] tracking-[0.3em] uppercase font-ui font-bold border-b border-black pb-1 hover:text-accent hover:border-accent transition-colors inline-flex items-center gap-2"
        >
          {cfg.cta_label || 'View All Drops'} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:auto-rows-[300px]">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className={`group relative overflow-hidden bg-muted ${colRowClass(item.col_span, item.row_span)}`}
          >
            <Link to={item.href} className="block w-full h-full">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end text-white translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                <span className="text-[9px] tracking-[0.4em] uppercase font-ui mb-2">{item.category}</span>
                <h3 className="text-2xl font-elegant tracking-tight mb-4">{item.title}</h3>
                <span className="text-[10px] tracking-[0.3em] uppercase font-ui font-bold border-b border-white/40 pb-1 self-start hover:border-white transition-colors inline-flex items-center gap-2">
                  Explore Piece <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
