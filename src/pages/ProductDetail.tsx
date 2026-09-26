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
import { useSEO } from '@/lib/useSEO';
import { motion, AnimatePresence } from 'framer-motion';

const FALLBACK_PRODUCTS_MAP: Record<string, any> = {
  'heavyweight-box-tee': {
    id: 'bs-1',
    slug: 'heavyweight-box-tee',
    name: 'The Heavyweight Box Tee v2.0 - Archive',
    description: 'Constructed from 280 GSM combed cotton. Boxy, drop-shoulder silhouette built for effortless layering.',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=90&w=800',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=90&w=800'
    ],
    brands: { name: 'VAULT 26', slug: 'vault-26' },
    categories: { name: 'Essentials', slug: 'men', id: 'cat-1' },
    product_variants: [
      { id: 'v1-1', price: 3490, compare_price: 4490, size: 'S', color: 'Onyx', color_hex: '#0F0F0F', stock: 10 },
      { id: 'v1-2', price: 3490, compare_price: 4490, size: 'M', color: 'Onyx', color_hex: '#0F0F0F', stock: 15 },
      { id: 'v1-3', price: 3490, compare_price: 4490, size: 'L', color: 'Onyx', color_hex: '#0F0F0F', stock: 20 },
      { id: 'v1-4', price: 3490, compare_price: 4490, size: 'XL', color: 'Onyx', color_hex: '#0F0F0F', stock: 8 }
    ]
  },
  'raw-selvedge-oversized-denim': {
    id: 'bs-2',
    slug: 'raw-selvedge-oversized-denim',
    name: 'The Denim Shirt v2.0 - Archive',
    description: '14oz japanese selvedge denim utility shirt. Custom hardware, double-stitched seams, relaxed silhouette.',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=90&w=800',
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=90&w=800'
    ],
    brands: { name: 'VAULT 26', slug: 'vault-26' },
    categories: { name: 'Outerwear', slug: 'men', id: 'cat-2' },
    product_variants: [
      { id: 'v2-1', price: 7990, compare_price: 9990, size: 'S', color: 'Indigo', color_hex: '#4B6B94', stock: 5 },
      { id: 'v2-2', price: 7990, compare_price: 9990, size: 'M', color: 'Indigo', color_hex: '#4B6B94', stock: 12 },
      { id: 'v2-3', price: 7990, compare_price: 9990, size: 'L', color: 'Indigo', color_hex: '#4B6B94', stock: 8 }
    ]
  },
  'architectural-fleece-hoodie': {
    id: 'bs-3',
    slug: 'architectural-fleece-hoodie',
    name: 'The Lightweight T-Shirt v2.0 - Archive',
    description: '450 GSM French terry fleece with double-layered hood and ribbing. Designed for warmth and structured drape.',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=90&w=800',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=90&w=800'
    ],
    brands: { name: 'VAULT 26', slug: 'vault-26' },
    categories: { name: 'Essentials', slug: 'men', id: 'cat-1' },
    product_variants: [
      { id: 'v3-1', price: 4290, compare_price: 5490, size: 'M', color: 'Heather Grey', color_hex: '#888888', stock: 10 },
      { id: 'v3-2', price: 4290, compare_price: 5490, size: 'L', color: 'Heather Grey', color_hex: '#888888', stock: 14 }
    ]
  },
  'minimalist-cargo-trousers': {
    id: 'bs-4',
    slug: 'minimalist-cargo-trousers',
    name: 'The Merino Wool Polo v1.4 - Archive',
    description: 'Fine 100% merino wool knit polo shirt. Breathable, naturally temperature-regulating and refined.',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=90&w=800',
      'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&q=90&w=800'
    ],
    brands: { name: 'VAULT 26', slug: 'vault-26' },
    categories: { name: 'Knitwear', slug: 'men', id: 'cat-3' },
    product_variants: [
      { id: 'v4-1', price: 6990, compare_price: 8990, size: 'M', color: 'Forest Green', color_hex: '#243029', stock: 8 },
      { id: 'v4-2', price: 6990, compare_price: 8990, size: 'L', color: 'Forest Green', color_hex: '#243029', stock: 10 }
    ]
  },
  'structured-utility-overshirt': {
    id: 'bs-5',
    slug: 'structured-utility-overshirt',
    name: 'The Merino Zip Cardigan v1.3 - Archive',
    description: 'Heavy gauge ribbed knit cardigan with two-way matte zipper and clean mock-neck collar.',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=90&w=800',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=90&w=800'
    ],
    brands: { name: 'VAULT 26', slug: 'vault-26' },
    categories: { name: 'Outerwear', slug: 'men', id: 'cat-2' },
    product_variants: [
      { id: 'v5-1', price: 8490, compare_price: 10490, size: 'M', color: 'Navy', color_hex: '#1E293B', stock: 6 },
      { id: 'v5-2', price: 8490, compare_price: 10490, size: 'L', color: 'Navy', color_hex: '#1E293B', stock: 9 }
    ]
  }
};

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [activeImg, setActiveImg] = useState(0);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<string>('desc');
  const [reviews, setReviews] = useState<{ name: string; quote: string; rating: number }[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [related, setRelated] = useState<ProductCardData[]>([]);
  const add = useCart((s) => s.add);
  const { ids, toggle } = useWishlist();

  useEffect(() => {
    (async () => {
      if (!slug) return;
      
      let p = null;
      try {
        const { data, error } = await supabase.from('products').select('*, brands(name, slug), categories(name, slug, id), product_variants(*)').eq('slug', slug).maybeSingle();
        if (!error && data) p = data;
      } catch (e) {
        console.warn('Supabase product query error:', e);
      }

      if (!p && slug && FALLBACK_PRODUCTS_MAP[slug]) {
        p = FALLBACK_PRODUCTS_MAP[slug];
      }

      if (!p) {
        p = {
          id: `p-${slug}`,
          slug: slug,
          name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' - Archive',
          description: 'Vault 26 limited edition archive piece. Heavyweight textile with custom finishing.',
          images: [
            'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=90&w=800',
            'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=90&w=800'
          ],
          brands: { name: 'VAULT 26', slug: 'vault-26' },
          categories: { name: 'Archive', slug: 'all', id: 'cat-1' },
          product_variants: [
            { id: `v-${slug}-1`, price: 4990, compare_price: 5990, size: 'M', color: 'Onyx', color_hex: '#0F0F0F', stock: 10 },
            { id: `v-${slug}-2`, price: 4990, compare_price: 5990, size: 'L', color: 'Onyx', color_hex: '#0F0F0F', stock: 15 }
          ]
        };
      }

      setProduct(p);
      setVariants((p as any).product_variants || []);
      setActiveImg(0);
      const colors = Array.from(new Set(((p as any).product_variants || []).map((v: any) => v.color)));
      setColor((colors[0] || 'Onyx') as any);
      setSize(((p as any).product_variants?.[0]?.size || 'M') as any);

      // related
      if ((p as any).category_id) {
        try {
          const { data: rel } = await supabase.from('products').select('id, name, slug, images, brands(name), product_variants(price, compare_price)').eq('category_id', (p as any).category_id).neq('id', p.id).limit(4);
          setRelated((rel || []).map((r: any) => {
            const v = r.product_variants?.[0];
            return { id: r.id, slug: r.slug, name: r.name, brand: r.brands?.name, images: r.images || [], price: Number(v?.price || 0), comparePrice: v?.compare_price ? Number(v.compare_price) : null };
          }));
        } catch {
          setRelated([]);
        }
      }
    })();
  }, [slug]);

  useEffect(() => {
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
    return <div className="mx-auto max-w-[1440px] px-4 md:px-8 pt-[110px] pb-20 grid lg:grid-cols-[1fr_1.7fr_1.4fr] gap-4 animate-pulse"><div className="space-y-4"><div className="h-8 bg-[#F1F1F1] w-32" /><div className="h-16 bg-[#F1F1F1] w-3/4" /></div><div className="aspect-[4/5] bg-[#F1F1F1]" /><div className="h-64 bg-[#F1F1F1]" /></div>;
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

  const inStock = activeVariant ? activeVariant.stock > 0 : variants.some((v) => v.stock > 0);
  const comparePrice = activeVariant?.compare_price || product.product_variants?.[0]?.compare_price;
  const details: { id: string; label: string; body: React.ReactNode }[] = [
    { id: 'desc', label: 'About the piece', body: product.description || 'A signature Vault 26 piece, made for the everyday wardrobe.' },
    { id: 'mat', label: 'Material & care', body: [product.material, product.care && `Care: ${product.care}`].filter(Boolean).join(' · ') || 'Care instructions are on the inside label.' },
    { id: 'ship', label: 'Payment & delivery', body: 'Free shipping on orders above ₹999. Dispatched within 24 hours. Pay by UPI, card or cash on delivery.' },
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
                      onClick={() => { setColor(c.color); setSize(null); }}
                      aria-label={c.color}
                      className={cn('h-9 w-9 border transition-all', color === c.color ? 'border-[#BB0006] ring-2 ring-[#BB0006] ring-offset-2' : 'border-[#0F0F0F]/20 hover:border-[#0F0F0F]')}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            )}

            {sizesForColor.length > 0 && (
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
                <Info className="h-4 w-4" strokeWidth={1.8} /> {inStock ? 'In stock' : 'Out of stock'}
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
              <motion.img
                key={activeImg}
                src={product.images[activeImg]}
                alt={product.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
              />
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
            {product.images.length > 1 && (
              <>
                <button onClick={() => setActiveImg((activeImg - 1 + product.images.length) % product.images.length)} aria-label="Previous image" className="lg:hidden absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#BB0006] text-white flex items-center justify-center">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setActiveImg((activeImg + 1) % product.images.length)} aria-label="Next image" className="lg:hidden absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#BB0006] text-white flex items-center justify-center">
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
            {product.images.length > 1 && (
              <div className="hidden lg:flex gap-3 mt-3 overflow-x-auto scrollbar-hide">
                {product.images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={cn('shrink-0 w-[46%] aspect-[4/5] bg-[#F1F1F1] overflow-hidden border-2 transition-colors', activeImg === i ? 'border-[#BB0006]' : 'border-transparent hover:border-[#0F0F0F]/30')}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover mix-blend-multiply" />
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
