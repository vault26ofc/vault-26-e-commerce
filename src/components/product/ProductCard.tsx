import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { inr } from '@/lib/format';
import { useWishlist } from '@/lib/store';
import { cn } from '@/lib/utils';

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  images: string[];
  price: number;
  comparePrice?: number | null;
  isNew?: boolean;
  isLowStock?: boolean;
};

export default function ProductCard({ p }: { p: ProductCardData }) {
  const [hovered, setHovered] = useState(false);
  const { ids, toggle } = useWishlist();
  const wished = ids.includes(p.id);
  const onSale = p.comparePrice && p.comparePrice > p.price;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      whileInView={{ opacity: 1, y: 0 }} 
      viewport={{ once: true }} 
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link to={`/products/${p.slug}`} className="block">
        <div className="relative aspect-[3/4] bg-muted overflow-hidden"
          onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          <img src={p.images[0]} alt={p.name} loading="lazy"
            className={cn('absolute inset-0 w-full h-full object-cover transition-all duration-[1s] ease-[cubic-bezier(0.16,1,0.3,1)]', hovered && p.images[1] ? 'opacity-0' : 'opacity-100', hovered && "scale-105")} />
          {p.images[1] && (
            <img src={p.images[1]} alt="" loading="lazy"
              className={cn('absolute inset-0 w-full h-full object-cover transition-all duration-[1s] ease-[cubic-bezier(0.16,1,0.3,1)]', hovered ? 'opacity-100 scale-105' : 'opacity-0')} />
          )}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {onSale && <span className="bg-black text-white text-[9px] font-ui font-bold uppercase tracking-[0.2em] px-3 py-1.5">Sale</span>}
            {p.isNew && <span className="bg-accent text-white text-[9px] font-ui font-bold uppercase tracking-[0.2em] px-3 py-1.5">New</span>}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); toggle(p.id); }}
            className="absolute top-4 right-4 h-10 w-10 bg-white/85 backdrop-blur-md rounded-full flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-all duration-500 hover:bg-white shadow-sm"
            aria-label="Wishlist">
            <Heart className={cn('h-4 w-4 transition-colors', wished ? 'fill-accent stroke-accent' : 'stroke-black/60')} />
          </button>
        </div>
        <div className="pt-5 flex flex-col gap-1">
          {p.brand && <div className="text-[10px] tracking-[0.3em] font-ui font-bold text-black/30 uppercase">{p.brand}</div>}
          <div className="text-sm font-light tracking-wide text-black/80">{p.name}</div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-[12px] font-ui font-bold tracking-widest">{inr(p.price)}</span>
            {onSale && <span className="text-black/30 line-through text-[10px] font-ui tracking-widest">{inr(p.comparePrice!)}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

