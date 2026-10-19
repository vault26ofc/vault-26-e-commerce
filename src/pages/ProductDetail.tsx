import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Share2, Info, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionHead, TornEdge } from '@/components/polka/Polka';
import { supabase } from '@/integrations/supabase/client';
import { useCart, useWishlist } from '@/lib/store';
import { inr } from '@/lib/format';
import { toast } from 'sonner';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import { cn } from '@/lib/utils';
import { isVideoUrl } from '@/lib/media';
import { useSEO } from '@/lib/useSEO';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/useAuth';
import { imageProps } from '@/lib/image';
import { isOneSize } from '@/lib/sizes';
import { PRODUCT_CARD_SELECT, toProductCard } from '@/cms/lib/sectionProducts';

type Variant = { id: string; size: string | null; color: string | null; color_hex: string | null; stock: number; price: number | string; compare_price: number | string | null };

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<string>('desc');
  const [reviews, setReviews] = useState<{ name: string; quote: string; rating: number }[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [related, setRelated] = useState<ProductCardData[]>([]);
  const [freeShipping, setFreeShipping] = useState<number | null>(null);
  const add = useCart((s) => s.add);
  const { ids, toggle } = useWishlist();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setProduct(null); setMissing(false);
      const { data: p } = await supabase.from('products')
        .select('*, brands(name, slug), categories!products_category_id_fkey(name, slug, id), product_variants(*)')
        .eq('slug', slug).maybeSingle();
      if (cancelled) return;
      // Hidden products are only previewable by admins.
      if (!p || (!(p as any).is_active && !isAdmin)) { setMissing(true); return; }

      // Variants in the product's size order (Admin → Sizes, kept in products.sizes).
      const order: string[] = (p as any).sizes || [];
      const vs: Variant[] = [...((p as any).product_variants || [])].sort((a: Variant, b: Variant) => {
        const ia = order.indexOf(a.size || ''), ib = order.indexOf(b.size || '');
        return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
      });
      setProduct(p);
      setVariants(vs);
      setActiveImg(0);
      // Start on the first colour (and size) that is in stock.
      const first = vs.find((v) => v.stock > 0) || vs[0];
      setColor(first?.color ?? null);
      const forColor = vs.filter((v) => v.color === (first?.color ?? null));
      setSize(forColor.length === 1 ? forColor[0].size : (first && first.stock > 0 ? first.size : null));

      if ((p as any).category_id) {
        const { data: rel } = await supabase.from('products').select(PRODUCT_CARD_SELECT)
          .eq('category_id', (p as any).category_id).eq('is_active', true).neq('id', (p as any).id).limit(4);
        if (!cancelled) setRelated((rel || []).map(toProductCard));
      }
    })();
    return () => { cancelled = true; };
  }, [slug, isAdmin]);

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'free_shipping_threshold').maybeSingle()
      .then(({ data }) => { if (data) setFreeShipping(Number(data.value)); });
    (supabase.from('testimonials' as any) as any)
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true })
      .limit(10)
      .then(({ data }: any) => {
        setReviews(
          (data || [])
            .filter((t: any) => t.body || t.quote)
            .map((t: any) => ({
              name: t.name || t.author || 'Customer',
              quote: t.body || t.quote,
              rating: Math.max(1, Math.min(5, Number(t.rating) || 5)),
            })),
        );
      });
  }, []);

  const colors = useMemo(() => {
    const map = new Map<string, string | null>();
    variants.forEach((v) => { if (v.color && !map.has(v.color)) map.set(v.color, v.color_hex); });
    return Array.from(map.entries()).map(([color, hex]) => ({ color, hex }));
  }, [variants]);

  const sizesForColor = useMemo(() => variants.filter((v) => v.color === color), [variants, color]);
  // A single-size product (ONE SIZE) shows no size picker; a single plain item shows no pickers at all.
  const showSizes = sizesForColor.length > 0 && !(sizesForColor.length === 1 && isOneSize(sizesForColor[0].size));
  const activeVariant = useMemo(
    () => variants.find((v) => v.color === color && (v.size === size || (!showSizes && sizesForColor.length === 1))),
    [variants, color, size, showSizes, sizesForColor],
  );
  const minPrice = useMemo(
    () => (variants.length ? Math.min(...variants.map((v) => Number(v.price))) : Number(product?.price || 0)),
    [variants, product],
  );

  // Gallery: the chosen colour's own photos when it has any, otherwise the main photos (+ videos).
  const gallery: string[] = useMemo(() => {
    if (!product) return [];
    const own: string[] = (color && product.color_images?.[color]) || [];
    return own.length ? own : [...(product.images || []), ...(product.videos || [])];
  }, [product, color]);
  useEffect(() => { setActiveImg(0); }, [color]);

  useSEO(product ? {
    page: `products/${product.slug}`,
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
  } : { title: missing ? 'Not found — Vault 26' : 'Loading… — Vault 26', noindex: missing });

  if (missing) {
    return (
      <div className="bg-white min-h-screen pt-[56px] md:pt-[62px] flex flex-col items-center justify-center text-center px-4">
        <p className="font-display font-[800] uppercase text-[40px] md:text-[64px] leading-none text-[#0F0F0F]">Piece not found</p>
        <p className="font-sans text-[15px] text-[#0F0F0F]/60 mt-3 mb-6">This piece is no longer in the archive.</p>
        <Link to="/shop" className="h-12 px-8 bg-[#BB0006] text-white font-sans text-[15px] hover:bg-[#AA0001] flex items-center">Shop all pieces</Link>
      </div>
    );
  }

  if (!product) {
    return <div className="mx-auto max-w-[1440px] px-4 md:px-8 pt-[110px] pb-20 grid lg:grid-cols-[1fr_1.7fr_1.4fr] gap-4 animate-pulse"><div className="space-y-4"><div className="h-8 bg-[#F1F1F1] w-32" /><div className="h-16 bg-[#F1F1F1] w-3/4" /></div><div className="aspect-[4/5] bg-[#F1F1F1]" /><div className="h-64 bg-[#F1F1F1]" /></div>;
  }

  const wished = ids.includes(product.id);

  const addToCart = () => {
    if (!activeVariant) { toast.error(variants.length ? 'Please select a size' : 'This piece is sold out'); return; }
    if (activeVariant.stock < qty) { toast.error('Not enough stock'); return; }
    add({
      variantId: activeVariant.id,
      productId: product.id,
      name: product.name,
      brand: product.brands?.name,
      size: activeVariant.size,
      color: activeVariant.color,
      image: product.color_images?.[activeVariant.color || '']?.[0] || product.images?.[0] || '',
      price: Number(activeVariant.price),
      comparePrice: activeVariant.compare_price ? Number(activeVariant.compare_price) : null,
      quantity: qty,
      slug: product.slug,
    });
    toast.success('Added to bag');
  };

  const buyNow = () => { addToCart(); setTimeout(() => navigate('/checkout'), 100); };

  const inStock = activeVariant ? activeVariant.stock > 0 : variants.some((v) => v.stock > 0);
  const comparePrice = activeVariant ? activeVariant.compare_price : (variants[0]?.compare_price ?? product.compare_at);
  const details: { id: string; label: string; body: React.ReactNode }[] = [
    { id: 'desc', label: 'About the piece', body: product.description || 'A signature Vault 26 piece, made for the everyday wardrobe.' },
    { id: 'mat', label: 'Material & care', body: [product.material, product.care && `Care: ${product.care}`].filter(Boolean).join(' · ') || 'Care instructions are on the inside label.' },
    { id: 'ship', label: 'Payment & delivery', body: `${freeShipping ? `Free shipping on orders above ${inr(freeShipping)}. ` : ''}Dispatched within 24 hours. Pay by UPI, card or cash on delivery.` },
    { id: 'ret', label: 'Returns & exchange', body: '7-day easy returns and size exchanges on unworn pieces with tags attached.' },
  ];

  return (
    <div className="bg-white min-h-screen pt-[56px] md:pt-[62px]">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-[30px]">
        {/* Breadcrumb */}
        <nav className="pt-6 md:pt-8 font-sans text-[12px] md:text-[13px] uppercase text-[#0F0F0F]/60 truncate" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-[#0F0F0F]">Home</Link>
          <span className="mx-2">/</span>
          <Link to={product.categories?.slug ? `/category/${product.categories.slug}` : '/shop'} className="hover:text-[#0F0F0F]">
            {product.categories?.name || 'Shop'}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#0F0F0F] underline underline-offset-4">{product.name}</span>
        </nav>

        {/* Brand tag + title */}
        <div className="mt-8 md:mt-12">
          {product.brands?.name && (
            <Link to={`/brand/${product.brands.slug}`} className="inline-block border border-[#0F0F0F] px-3 py-1.5 font-sans text-[13px] text-[#0F0F0F] hover:border-[#BB0006] hover:text-[#BB0006]">
              {product.brands.name}
            </Link>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-2 font-display font-[800] uppercase text-[#0F0F0F] leading-[0.92] text-[clamp(38px,5vw,72px)] max-w-[900px]"
          >
            {product.name}
          </motion.h1>
        </div>

        <div className="mt-6 grid gap-8 lg:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1.4fr)]">
          {/* Buy column */}
          <div className="flex flex-col order-2 lg:order-1">
            <div className="flex items-baseline gap-3">
              <span className="font-sans text-[34px] md:text-[40px] text-[#0F0F0F] leading-none">
                {inr(activeVariant ? Number(activeVariant.price) : minPrice)}
              </span>
              {comparePrice && <span className="font-sans text-[16px] text-[#0F0F0F]/40 line-through">{inr(Number(comparePrice))}</span>}
            </div>

            {colors.length > 1 && (
              <div className="mt-8">
                <span className="font-sans uppercase text-[13px] text-[#0F0F0F]">Colour — {color}</span>
                <div className="flex gap-2 mt-3">
                  {colors.map((c) => (
                    <button
                      key={c.color}
                      onClick={() => {
                        setColor(c.color);
                        const forColor = variants.filter((v) => v.color === c.color);
                        setSize(forColor.length === 1 ? forColor[0].size : null);
                      }}
                      aria-label={c.color}
                      title={c.color}
                      className={cn('h-9 min-w-9 border transition-all', !c.hex && 'px-2 font-sans text-[12px] uppercase', color === c.color ? 'border-[#BB0006] ring-2 ring-[#BB0006] ring-offset-2' : 'border-[#0F0F0F]/20 hover:border-[#0F0F0F]')}
                      style={c.hex ? { backgroundColor: c.hex } : undefined}
                    >
                      {!c.hex && c.color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showSizes && (
              <div className="mt-8">
                <span className="font-sans uppercase text-[13px] text-[#0F0F0F]">Size</span>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {sizesForColor.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => v.stock > 0 && setSize(v.size)}
                      disabled={v.stock === 0}
                      className={cn(
                        'h-11 font-sans text-[14px] border transition-colors uppercase',
                        size === v.size ? 'bg-[#BB0006] text-white border-[#BB0006]' : 'border-[#0F0F0F] text-[#0F0F0F] hover:border-[#BB0006] hover:text-[#BB0006]',
                        v.stock === 0 && 'opacity-25 line-through cursor-not-allowed',
                      )}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto pt-10 space-y-3">
              <p className="flex items-center gap-2 font-sans text-[15px] text-[#0F0F0F]">
                <Info className="h-4 w-4" strokeWidth={1.8} /> {inStock ? (activeVariant && activeVariant.stock <= 3 ? `Only ${activeVariant.stock} left` : 'In stock') : 'Sold out'}
              </p>
              <button onClick={addToCart} disabled={!inStock} className="w-full h-12 md:h-[52px] bg-[#BB0006] text-white font-sans text-[15px] md:text-[16px] hover:bg-[#AA0001] transition-colors disabled:opacity-50">
                Add to bag
              </button>
              <button onClick={buyNow} disabled={!inStock} className="w-full h-12 md:h-[52px] bg-[#3A3A3A] text-white font-sans text-[15px] md:text-[16px] hover:bg-[#0F0F0F] transition-colors disabled:opacity-50">
                Buy now
              </button>
            </div>
          </div>

          {/* Main image */}
          <div className="relative order-1 lg:order-2 bg-[#F1F1F1] aspect-[4/5] lg:aspect-auto lg:min-h-[560px] overflow-hidden">
            <AnimatePresence mode="wait">
              {isVideoUrl(gallery[activeImg]) ? (
                <motion.video
                  key={`${color}-${activeImg}`}
                  src={gallery[activeImg]}
                  autoPlay muted loop playsInline controls
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <motion.img
                  key={`${color}-${activeImg}`}
                  {...imageProps(gallery[activeImg], { sizes: '(min-width: 1024px) 40vw, 100vw', priority: activeImg === 0 })}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
                />
              )}
            </AnimatePresence>
            <div className="absolute top-3 right-3 flex gap-1">
              <button onClick={() => toggle(product.id)} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} className="p-1.5 bg-white/80 hover:bg-white">
                <Heart strokeWidth={1.7} className={cn('h-5 w-5', wished && 'fill-[#BB0006] stroke-[#BB0006]')} />
              </button>
              <button
                onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied'); }}
                aria-label="Copy link"
                className="p-1.5 bg-white/80 hover:bg-white"
              >
                <Share2 strokeWidth={1.7} className="h-5 w-5" />
              </button>
            </div>
            {gallery.length > 1 && (
              <>
                <button onClick={() => setActiveImg((activeImg - 1 + gallery.length) % gallery.length)} aria-label="Previous image" className="lg:hidden absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#BB0006] text-white flex items-center justify-center">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setActiveImg((activeImg + 1) % gallery.length)} aria-label="Next image" className="lg:hidden absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#BB0006] text-white flex items-center justify-center">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Details accordion + thumbnails */}
          <div className="order-3 flex flex-col">
            <div className="border-t border-[#0F0F0F]/70">
              {details.map((d) => {
                const open = tab === d.id;
                return (
                  <div key={d.id} className="border-b border-[#0F0F0F]/70">
                    <button onClick={() => setTab(open ? ('' as any) : (d.id as any))} aria-expanded={open} className="w-full h-12 md:h-[52px] flex items-center justify-between font-sans uppercase text-[14px] md:text-[16px] text-[#0F0F0F]">
                      {d.label}
                      <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} strokeWidth={1.8} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                          <p className="pb-5 font-sans text-[15px] leading-relaxed text-[#0F0F0F]">{d.body}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            {gallery.length > 1 && (
              <div className="hidden lg:flex gap-3 mt-3 overflow-x-auto scrollbar-hide">
                {gallery.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={cn('shrink-0 w-[46%] aspect-[4/5] bg-[#F1F1F1] overflow-hidden border-2 transition-colors', activeImg === i ? 'border-[#BB0006]' : 'border-transparent hover:border-[#0F0F0F]/30')}
                  >
                    {isVideoUrl(img)
                      ? <video src={img} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                      : <img {...imageProps(img, { sizes: '20vw', maxWidth: 640 })} alt="" className="w-full h-full object-cover mix-blend-multiply" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews — red torn block */}
      <section className="relative mt-20 md:mt-28 bg-[#BB0006] text-white">
        <TornEdge color="#BB0006" position="top" seed={83} className="!-translate-y-[98%] !rotate-0" />
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-[30px] py-12 md:py-16 grid md:grid-cols-[1fr_2fr] gap-8 md:gap-16">
          <div>
            <h2 className="font-display font-[800] uppercase text-[44px] md:text-[64px] leading-none">Reviews</h2>
            <p className="font-sans text-[15px] leading-relaxed mt-3 max-w-[340px]">
              What customers say about the pieces that made it into their rotation.
            </p>
          </div>
          <div>
            <div className="border-y border-white/70 h-12 flex items-center font-sans uppercase text-[14px]">Newest first</div>
            {reviews.length === 0 ? (
              <p className="font-sans text-[15px] py-8">No reviews yet. Bought this piece? Tell us how it wears.</p>
            ) : (
              <div className="py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-sans font-bold uppercase text-[15px]">{reviews[reviewIdx].name}</p>
                    <p className="text-[18px] tracking-[2px]" aria-label={`${reviews[reviewIdx].rating} out of 5`}>
                      {'★'.repeat(reviews[reviewIdx].rating)}
                      <span className="opacity-40">{'★'.repeat(5 - reviews[reviewIdx].rating)}</span>
                    </p>
                  </div>
                  {reviews.length > 1 && (
                    <div className="flex gap-2">
                      <button onClick={() => setReviewIdx((reviewIdx - 1 + reviews.length) % reviews.length)} aria-label="Previous review" className="w-8 h-8 bg-white text-[#BB0006] flex items-center justify-center"><ChevronLeft className="h-5 w-5" /></button>
                      <button onClick={() => setReviewIdx((reviewIdx + 1) % reviews.length)} aria-label="Next review" className="w-8 h-8 bg-white text-[#BB0006] flex items-center justify-center"><ChevronRight className="h-5 w-5" /></button>
                    </div>
                  )}
                </div>
                <p className="font-sans text-[15px] md:text-[16px] leading-relaxed mt-4 max-w-[640px]">{reviews[reviewIdx].quote}</p>
              </div>
            )}
          </div>
        </div>
        <TornEdge color="#FFFFFF" position="bottom" seed={89} />
      </section>

      {/* You may also like */}
      {related.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-[30px] py-14 md:py-20">
          <SectionHead title="You may also like" to={product.categories?.slug ? `/category/${product.categories.slug}` : '/shop'} linkLabel="View all" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 md:gap-x-4 gap-y-10">
            {related.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
