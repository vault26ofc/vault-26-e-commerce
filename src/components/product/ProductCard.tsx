import { Link } from 'react-router-dom';
import { Heart, ShoppingBasket } from 'lucide-react';
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
  sizeLabel?: string;
};

/**
 * Polka product card: margin-grey tile, outline heart top-right, name + price
 * below, red outlined basket button. `large` is the oversized feature tile used
 * in Polka's asymmetric grids.
 */
export default function ProductCard({ p, large = false }: { p: ProductCardData; large?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const { ids, toggle } = useWishlist();
  const wished = ids.includes(p.id);
  const onSale = Boolean(p.comparePrice && p.comparePrice > p.price);
  const discountPercent = onSale && p.comparePrice
    ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
    : null;

  const mainImage = p.images?.[0] || '/camo_zip_up_hoodie.png';
  const secondImage = p.images?.[1] && p.images[1] !== mainImage ? p.images[1] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col w-full"
    >
      <Link
        to={`/products/${p.slug}`}
        className={cn(
          'relative block w-full bg-[#F1F1F1] overflow-hidden',
          large ? 'aspect-[520/545]' : 'aspect-[252/292]',
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className={cn('absolute inset-0 flex items-center justify-center', large ? 'p-[7%]' : 'p-[8%]')}>
          <motion.img
            src={mainImage}
            alt={p.name}
            loading="lazy"
            decoding="async"
            animate={{ opacity: hovered && secondImage ? 0 : 1, scale: hovered ? 1.04 : 1 }}
            transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
            className="w-full h-full object-cover mix-blend-multiply pointer-events-none"
          />
        </div>
        {secondImage && (
          <div className={cn('absolute inset-0 flex items-center justify-center', large ? 'p-[7%]' : 'p-[8%]')}>
            <motion.img
              src={secondImage}
              alt=""
              loading="lazy"
              decoding="async"
              initial={false}
              animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1.04 : 1 }}
              transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
              className="w-full h-full object-cover mix-blend-multiply pointer-events-none"
            />
          </div>
        )}

        {(discountPercent !== null || p.isNew) && (
          <span className="absolute top-3 left-3 bg-[#BB0006] text-white font-display font-[800] uppercase text-[13px] leading-none px-1.5 pt-1 pb-0.5">
            {discountPercent !== null ? `-${discountPercent}%` : 'New'}
          </span>
        )}

        <button
          onClick={(e) => { e.preventDefault(); toggle(p.id); }}
          className="absolute top-3 right-3 p-1 text-[#0F0F0F] hover:text-[#BB0006] transition-colors z-10"
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            strokeWidth={1.6}
            className={cn('h-[18px] w-[18px]', wished && 'fill-[#BB0006] stroke-[#BB0006]')}
          />
        </button>
      </Link>

      <div className="flex items-start justify-between gap-3 pt-3">
        <Link to={`/products/${p.slug}`} className="min-w-0 font-sans">
          <p className={cn('text-[#0F0F0F] leading-snug line-clamp-2', large ? 'text-[15px]' : 'text-[13px] md:text-[14px]')}>
            {p.name}
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={cn('font-bold', large ? 'text-[16px]' : 'text-[14px] md:text-[15px]', onSale ? 'text-[#BB0006]' : 'text-[#0F0F0F]')}>
              {inr(p.price)}
            </span>
            {onSale && p.comparePrice && (
              <span className="text-[12px] text-[#0F0F0F]/40 line-through">{inr(p.comparePrice)}</span>
            )}
          </div>
        </Link>
        <Link
          to={`/products/${p.slug}`}
          aria-label={`Choose size for ${p.name}`}
          className="shrink-0 w-8 h-8 md:w-9 md:h-9 border border-[#BB0006] text-[#BB0006] flex items-center justify-center hover:bg-[#BB0006] hover:text-white transition-colors"
        >
          <ShoppingBasket strokeWidth={1.6} className="w-[18px] h-[18px]" />
        </Link>
      </div>
    </motion.div>
  );
}
