import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Share2, MessageCircle, Truck, RefreshCw, Shield, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart, useWishlist } from '@/lib/store';
import { inr } from '@/lib/format';
import { toast } from 'sonner';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import { cn } from '@/lib/utils';
import { useSEO } from '@/lib/useSEO';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'desc' | 'mat' | 'ship'>('desc');
  const [related, setRelated] = useState<ProductCardData[]>([]);
  const add = useCart((s) => s.add);
  const { ids, toggle } = useWishlist();

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setProduct(null);
      const { data: p, error } = await supabase.from('products').select('*, brands(name, slug), categories(name, slug, id), product_variants(*)').eq('slug', slug).maybeSingle();
      
      if (error || !p) {
        navigate('/404', { replace: true });
        return;
      }

      setProduct(p);
      setVariants((p as any).product_variants || []);
      setActiveImg(0);
      const colors = Array.from(new Set(((p as any).product_variants || []).map((v: any) => v.color)));
      setColor(colors[0] as any);
      setSize(null);

      // related
      if ((p as any).category_id) {
        const { data: rel } = await supabase.from('products').select('id, name, slug, images, brands(name), product_variants(price, compare_price)').eq('category_id', (p as any).category_id).neq('id', p.id).limit(4);
        setRelated((rel || []).map((r: any) => {
          const v = r.product_variants?.[0];
          return { id: r.id, slug: r.slug, name: r.name, brand: r.brands?.name, images: r.images || [], price: Number(v?.price || 0), comparePrice: v?.compare_price ? Number(v.compare_price) : null };
        }));
      }
    })();
  }, [slug, navigate]);

  const colors = useMemo(() => {
    const map = new Map<string, string>();
    variants.forEach((v) => { if (v.color) map.set(v.color, v.color_hex); });
    return Array.from(map.entries()).map(([color, hex]) => ({ color, hex }));
  }, [variants]);

  const sizesForColor = useMemo(() => variants.filter((v) => v.color === color), [variants, color]);
  const activeVariant = useMemo(() => variants.find((v) => v.color === color && v.size === size), [variants, color, size]);
  const minPrice = useMemo(() => Math.min(...variants.map((v) => Number(v.price))), [variants]);

  useSEO(product ? {
    title: `${product.name} — Vault 26`,
    description: (product.description || `Shop ${product.name} from Vault 26 — premium minimalist streetwear made in India.`).slice(0, 160),
    image: product.images?.[0],
    type: 'product',
    canonical: `https://vault26.co.in/products/${product.slug}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description || `${product.name} from Vault 26`,
      image: product.images || [],
      brand: { '@type': 'Brand', name: product.brands?.name || 'Vault 26' },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'INR',
        lowPrice: minPrice,
        offerCount: variants.length,
        availability: variants.some((v) => v.stock > 0)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: 'Vault 26' },
      },
    },
  } : { title: 'Loading… — Vault 26' });

  if (!product) {
    return <div className="container-px py-40 grid lg:grid-cols-2 gap-20 animate-pulse"><div className="aspect-[3/4] bg-muted" /><div className="space-y-8"><div className="h-4 bg-muted w-32" /><div className="h-12 bg-muted w-3/4" /></div></div>;
  }

  const wished = ids.includes(product.id);

  const addToCart = () => {
    if (!activeVariant) { toast.error('Please select a size'); return; }
    if (activeVariant.stock < qty) { toast.error('Not enough stock'); return; }
    add({
      variantId: activeVariant.id,
      productId: product.id,
      name: product.name,
      brand: product.brands?.name,
      size: activeVariant.size,
      color: activeVariant.color,
      image: product.images[0],
      price: Number(activeVariant.price),
      comparePrice: activeVariant.compare_price ? Number(activeVariant.compare_price) : null,
      quantity: qty,
      slug: product.slug,
    });
    toast.success('Added to bag');
  };

  const buyNow = () => { addToCart(); setTimeout(() => navigate('/checkout'), 100); };

  return (
    <div className="container-px pt-24 pb-12 md:py-24 min-h-screen bg-white">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-ui font-bold text-black/50 hover:text-black transition-colors mb-8 md:mb-12"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">
        {/* Visuals */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="aspect-[3/4] bg-muted overflow-hidden"
          >
            <img src={product.images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
          </motion.div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img: string, i: number) => (
                <button 
                  key={i} 
                  onClick={() => setActiveImg(i)} 
                  className={cn(
                    'aspect-[3/4] overflow-hidden transition-all duration-500', 
                    activeImg === i ? 'ring-1 ring-black ring-offset-4' : 'opacity-60 hover:opacity-100'
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {product.brands?.name && (
              <Link to={`/brand/${product.brands.slug}`} className="text-[11px] tracking-[0.4em] uppercase font-ui font-bold text-accent mb-4 block">
                {product.brands.name}
              </Link>
            )}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-elegant font-light tracking-tight mb-4 md:mb-6">
              {product.name}
            </h1>
            <div className="flex items-center gap-4 mb-8 md:mb-10">
              <span className="text-xl md:text-2xl font-ui font-bold tracking-tight">
                {inr(activeVariant ? Number(activeVariant.price) : minPrice)}
              </span>
              {(activeVariant?.compare_price || product.product_variants?.[0]?.compare_price) && (
                <span className="text-black/30 line-through text-xs md:text-sm font-ui tracking-tight italic">
                  {inr(Number(activeVariant?.compare_price || product.product_variants[0].compare_price))}
                </span>
              )}
            </div>

            {/* Colors */}
            {colors.length > 1 && (
              <div className="mb-10">
                <span className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold mb-4 block">Archive Shade</span>
                <div className="flex gap-4">
                  {colors.map((c) => (
                    <button 
                      key={c.color} 
                      onClick={() => { setColor(c.color); setSize(null); }}
                      className={cn(
                        'h-10 w-10 rounded-full border border-black/5 transition-all duration-500', 
                        color === c.color ? 'scale-125 ring-1 ring-black ring-offset-4' : 'hover:scale-110'
                      )}
                      style={{ backgroundColor: c.hex }} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizesForColor.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold">Silhouette / Size</span>
                  <button className="text-[10px] tracking-[0.2em] uppercase font-ui font-bold border-b border-black pb-0.5">Guide</button>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {sizesForColor.map((v) => (
                    <button 
                      key={v.id} 
                      onClick={() => v.stock > 0 && setSize(v.size)} 
                      disabled={v.stock === 0}
                      className={cn(
                        'py-4 text-[11px] font-ui font-bold tracking-[0.2em] border transition-all duration-500 uppercase', 
                        size === v.size ? 'bg-black text-white border-black' : 'border-black/10 hover:border-black', 
                        v.stock === 0 && 'opacity-20 line-through cursor-not-allowed'
                      )}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 md:gap-4 mb-10 md:mb-12">
              <div className="flex gap-3 md:gap-4">
                <button 
                  onClick={addToCart} 
                  className="flex-1 bg-black text-white py-4 md:py-5 text-[10px] md:text-[11px] tracking-[0.3em] md:tracking-[0.4em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500"
                >
                  Secure Archive Piece
                </button>
                <button 
                  onClick={() => toggle(product.id)}
                  className="w-14 md:w-16 flex items-center justify-center border border-black/10 hover:border-black transition-colors duration-500"
                >
                  <Heart className={cn('h-4 w-4 md:h-5 md:w-5 transition-all', wished && 'fill-accent stroke-accent scale-110')} />
                </button>
              </div>
              <button 
                onClick={buyNow} 
                className="w-full border border-black py-4 md:py-5 text-[10px] md:text-[11px] tracking-[0.3em] md:tracking-[0.4em] uppercase font-ui font-bold hover:bg-black hover:text-white transition-all duration-500"
              >
                Buy Now
              </button>
            </div>

            {/* Content Tabs */}
            <div className="border-t border-black/5">
              <div className="flex gap-8 border-b border-black/5">
                {[
                  { id: 'desc', label: 'THE STORY' },
                  { id: 'mat', label: 'MATERIAL' },
                  { id: 'ship', label: 'SHIPPING' }
                ].map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setTab(t.id as any)}
                    className={cn(
                      'py-5 text-[10px] tracking-[0.3em] font-ui font-bold transition-all duration-500 relative',
                      tab === t.id ? 'text-black' : 'text-black/30 hover:text-black'
                    )}
                  >
                    {t.label}
                    {tab === t.id && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
                  </button>
                ))}
              </div>
              <div className="py-8 min-h-[120px]">
                <p className="text-sm font-ui font-light text-black/50 leading-relaxed uppercase tracking-[0.05em]">
                  {tab === 'desc' && (product.description || 'A signature Vault 26 piece, made for the everyday wardrobe.')}
                  {tab === 'mat' && (<>{product.material} // Care: {product.care}</>)}
                  {tab === 'ship' && (<>Free shipping on orders above ₹999. Dispatched within 24 hours. 7-day easy returns.</>)}
                </p>
              </div>
            </div>

            {/* Confidence Bar */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-black/5">
              {[
                { Icon: Truck, label: 'GLOBAL_SHIP' },
                { Icon: RefreshCw, label: 'EASY_EXCHANGE' },
                { Icon: Shield, label: 'SECURE_TRANS' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <item.Icon className="h-4 w-4 text-black/20" strokeWidth={1} />
                  <span className="text-[9px] tracking-[0.3em] font-ui font-bold text-black/20 uppercase">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16 md:mt-32 border-t border-black/5 pt-12 md:pt-24">
          <div className="flex items-end justify-between mb-10 md:mb-16">
            <h2 className="display-2 font-elegant font-light italic text-3xl md:text-5xl">Related <span className="text-accent">Pieces</span></h2>
            <Link to="/search" className="text-[10px] tracking-[0.3em] uppercase font-ui font-bold border-b border-black pb-0.5">Explore All</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 gap-y-16">
            {related.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
