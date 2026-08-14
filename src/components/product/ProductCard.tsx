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
  sizeLabel?: string;
};

export default function ProductCard({ p }: { p: ProductCardData }) {
  const [hovered, setHovered] = useState(false);
  const { ids, toggle } = useWishlist();
  const wished = ids.includes(p.id);
  const onSale = Boolean(p.comparePrice && p.comparePrice > p.price);
  
  // Calculate discount percentage (e.g. -40%) matching Daily Paper style badge
  const discountPercent = onSale && p.comparePrice
    ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
    : null;

  // Determine secondary image for hover slide transition (fallback if single image provided)
  const mainImage = p.images?.[0] || '/camo_zip_up_hoodie.png';
  const secondImage = p.images?.[1] && p.images[1] !== mainImage ? p.images[1] : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }} 
      whileInView={{ opacity: 1, y: 0 }} 
      viewport={{ once: true }} 
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col w-full"
    >
      <Link to={`/products/${p.slug}`} className="block w-full">
        {/* Studio Light-Grey Image Container with Sliding Image Hover Effect */}
        <div 
          className="relative aspect-[3/4.2] bg-[#EFEFEF] overflow-hidden rounded-none border border-black/5 flex items-center justify-center p-6 sm:p-8 cursor-pointer"
          onMouseEnter={() => setHovered(true)} 
          onMouseLeave={() => setHovered(false)}
        >
          {/* Primary Cutout Studio Image (Slides left out of frame on hover) */}
          <motion.img 
            src={mainImage} 
            alt={p.name} 
            loading="lazy" 
            decoding="async"
            animate={{
              x: hovered && secondImage ? '-100%' : '0%',
              opacity: hovered && secondImage ? 0 : 1,
              scale: hovered ? 1.05 : 1,
            }}
            transition={{
              duration: 0.5,
              ease: [0.25, 1, 0.5, 1],
            }}
            className="max-h-full max-w-full object-contain object-center mix-blend-multiply pointer-events-none"
          />

          {/* Secondary Cutout Image (Slides in from right on hover) */}
          {secondImage && (
            <motion.img 
              src={secondImage} 
              alt={p.name} 
              loading="lazy" 
              decoding="async"
              initial={{ x: '100%', opacity: 0 }}
              animate={{
                x: hovered ? '0%' : '100%',
                opacity: hovered ? 1 : 0,
                scale: hovered ? 1.05 : 1,
              }}
              transition={{
                duration: 0.5,
                ease: [0.25, 1, 0.5, 1],
              }}
              className="absolute inset-0 m-auto max-h-full max-w-full object-contain object-center mix-blend-multiply p-6 sm:p-8 pointer-events-none"
            />
          )}

          {/* Discount Percentage Badge (Top Left Corner — Daily Paper style -40% box) */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
            {discountPercent !== null ? (
              <span className="bg-white text-black text-[10px] sm:text-xs font-sans font-bold uppercase tracking-wider px-2 py-1 shadow-sm rounded-none border border-black/5">
                -{discountPercent}%
              </span>
            ) : p.isNew ? (
              <span className="bg-white text-black text-[10px] sm:text-xs font-sans font-bold uppercase tracking-wider px-2 py-1 shadow-sm rounded-none border border-black/5">
                NEW
              </span>
            ) : null}
          </div>

          {/* Wishlist Heart Icon (Top Right Corner) */}
          <button
            onClick={(e) => { e.preventDefault(); toggle(p.id); }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-black hover:text-[#B11226] transition-colors cursor-pointer z-10 opacity-80 md:opacity-0 md:group-hover:opacity-100"
            aria-label="Wishlist"
          >
            <Heart className={cn('h-3.5 w-3.5 transition-colors', wished ? 'fill-[#B11226] stroke-[#B11226]' : 'stroke-black/70')} />
          </button>

          {/* Size Indicator at Image Bottom (Daily Paper style) */}
          {p.sizeLabel && (
            <div className="absolute bottom-3 left-0 right-0 text-center text-[10px] font-sans text-black/40 uppercase tracking-wider pointer-events-none">
              {p.sizeLabel}
            </div>
          )}
        </div>

        {/* Product Details Below Image Container */}
        <div className="pt-2.5 px-0.5 flex flex-col gap-1 text-left font-sans">
          {/* Product Name (Bold, Uppercase Sans-Serif) */}
          <h3 className="text-xs sm:text-[13px] font-sans font-bold text-black tracking-wide uppercase leading-tight line-clamp-1 group-hover:text-[#B11226] transition-colors">
            {p.name}
          </h3>

          {/* Price Line (Red for Discounted Price, Struck-through Original Price) & Color Swatch */}
          <div className="flex items-center justify-between pt-0.5 font-sans">
            <div className="flex items-center gap-2">
              <span className={cn("text-xs sm:text-sm font-sans font-bold", onSale ? "text-[#E63946]" : "text-black")}>
                {inr(p.price)}
              </span>
              {onSale && p.comparePrice && (
                <span className="text-[11px] sm:text-xs font-sans text-black/40 line-through font-normal">
                  {inr(p.comparePrice)}
                </span>
              )}
            </div>

            {/* Daily Paper Style Color Accent Swatch */}
            <span className="w-2.5 h-2.5 bg-[#8B5A2B] border border-black/10 rounded-none shrink-0" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
