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
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
      <Link to={`/products/${p.slug}`} className="block group">
        <div className="relative aspect-[3/4] bg-muted overflow-hidden"
          onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          <img src={p.images[0]} alt={p.name} loading="lazy"
            className={cn('absolute inset-0 w-full h-full object-cover transition-opacity duration-500', hovered && p.images[1] ? 'opacity-0' : 'opacity-100')} />
          {p.images[1] && (
            <img src={p.images[1]} alt="" loading="lazy"
              className={cn('absolute inset-0 w-full h-full object-cover transition-opacity duration-500', hovered ? 'opacity-100' : 'opacity-0')} />
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {onSale && <span className="bg-foreground text-background text-[10px] uppercase tracking-widest px-2 py-1">Sale</span>}
            {p.isNew && <span className="bg-accent text-accent-foreground text-[10px] uppercase tracking-widest px-2 py-1">New</span>}
            {p.isLowStock && <span className="bg-destructive text-destructive-foreground text-[10px] uppercase tracking-widest px-2 py-1">Low stock</span>}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); toggle(p.id); }}
            className="absolute top-3 right-3 h-9 w-9 bg-background/85 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
            aria-label="Wishlist">
            <Heart className={cn('h-4 w-4', wished ? 'fill-accent stroke-accent' : '')} />
          </button>
        </div>
        <div className="pt-3 pb-1">
          {p.brand && <div className="eyebrow">{p.brand}</div>}
          <div className="text-sm mt-0.5 leading-snug">{p.name}</div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="font-medium">{inr(p.price)}</span>
            {onSale && <span className="text-muted-foreground line-through text-xs">{inr(p.comparePrice!)}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
