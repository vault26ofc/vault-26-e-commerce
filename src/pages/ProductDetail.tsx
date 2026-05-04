import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Share2, MessageCircle, Truck, RefreshCw, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart, useWishlist } from '@/lib/store';
import { inr } from '@/lib/format';
import { toast } from 'sonner';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import { cn } from '@/lib/utils';
import { useSEO } from '@/lib/useSEO';

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
      const { data: p } = await supabase.from('products').select('*, brands(name, slug), categories(name, slug, id), product_variants(*)').eq('slug', slug).maybeSingle();
      if (!p) return;
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
  }, [slug]);

  const colors = useMemo(() => {
    const map = new Map<string, string>();
    variants.forEach((v) => { if (v.color) map.set(v.color, v.color_hex); });
    return Array.from(map.entries()).map(([color, hex]) => ({ color, hex }));
  }, [variants]);

  const sizesForColor = useMemo(() => variants.filter((v) => v.color === color), [variants, color]);
  const activeVariant = useMemo(() => variants.find((v) => v.color === color && v.size === size), [variants, color, size]);
  const minPrice = useMemo(() => Math.min(...variants.map((v) => Number(v.price))), [variants]);
  const minCompare = useMemo(() => {
    const cp = variants.map((v) => v.compare_price ? Number(v.compare_price) : null).filter(Boolean) as number[];
    return cp.length ? Math.min(...cp) : null;
  }, [variants]);

  if (!product) {
    return <div className="container-px py-20 grid lg:grid-cols-2 gap-10"><div className="aspect-[3/4] bg-muted animate-pulse" /><div className="space-y-4"><div className="h-6 w-32 bg-muted animate-pulse" /><div className="h-10 w-3/4 bg-muted animate-pulse" /></div></div>;
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

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: product.name, url }); } catch {} }
    else { navigator.clipboard.writeText(url); toast.success('Link copied'); }
  };

  return (
    <div className="container-px py-8">
      <div className="grid lg:grid-cols-2 gap-10">
        <div>
          <div className="aspect-[3/4] bg-muted overflow-hidden">
            <img src={product.images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img: string, i: number) => (
                <button key={i} onClick={() => setActiveImg(i)} className={cn('w-20 aspect-[3/4] overflow-hidden border', activeImg === i ? 'border-foreground' : 'border-transparent')}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 self-start">
          {product.brands?.name && <Link to={`/brand/${product.brands.slug}`} className="eyebrow link-underline">{product.brands.name}</Link>}
          <h1 className="font-display text-3xl md:text-4xl mt-2">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xl font-medium">{inr(activeVariant ? Number(activeVariant.price) : minPrice)}</span>
            {(activeVariant?.compare_price || minCompare) && (
              <span className="text-muted-foreground line-through text-sm">{inr(Number(activeVariant?.compare_price || minCompare))}</span>
            )}
          </div>

          {colors.length > 1 && (
            <div className="mt-7">
              <div className="eyebrow mb-2">Color · <span className="text-foreground">{color}</span></div>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button key={c.color} onClick={() => { setColor(c.color); setSize(null); }}
                    className={cn('h-9 w-9 rounded-full border-2 transition-all', color === c.color ? 'border-foreground scale-110' : 'border-border')}
                    style={{ backgroundColor: c.hex }} aria-label={c.color} />
                ))}
              </div>
            </div>
          )}

          {sizesForColor.length > 0 && (
            <div className="mt-7">
              <div className="flex items-center justify-between mb-2">
                <span className="eyebrow">Size</span>
                <button className="eyebrow link-underline">Size guide</button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {sizesForColor.map((v) => (
                  <button key={v.id} onClick={() => v.stock > 0 && setSize(v.size)} disabled={v.stock === 0}
                    className={cn('py-3 text-sm border transition-colors', size === v.size ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground', v.stock === 0 && 'opacity-40 line-through cursor-not-allowed')}>
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 flex items-center gap-3">
            <div className="inline-flex border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2.5">−</button>
              <span className="px-4 py-2.5 text-sm">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-3 py-2.5">+</button>
            </div>
            <button onClick={() => toggle(product.id)} className="h-11 w-11 border border-border hover:border-foreground flex items-center justify-center btn-press">
              <Heart className={cn('h-4 w-4', wished && 'fill-accent stroke-accent')} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={addToCart} className="bg-foreground text-background py-4 text-xs uppercase tracking-widest btn-press hover:bg-accent hover:text-accent-foreground transition-colors">Add to Bag</button>
            <button onClick={buyNow} className="border border-foreground py-4 text-xs uppercase tracking-widest btn-press hover:bg-foreground hover:text-background transition-colors">Buy Now</button>
          </div>

          <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
            <button onClick={share} className="inline-flex items-center gap-1.5 link-underline"><Share2 className="h-3.5 w-3.5" /> Share</button>
            <a href={`https://wa.me/919999999999?text=${encodeURIComponent(`Hi, I'm interested in ${product.name}`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 link-underline"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp enquiry</a>
          </div>

          {/* Tabs */}
          <div className="mt-10 border-t border-border">
            <div className="flex gap-7 border-b border-border">
              {[['desc','Description'],['mat','Material & Care'],['ship','Shipping']].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k as any)} className={cn('py-4 text-xs uppercase tracking-widest', tab === k ? 'text-foreground border-b border-foreground -mb-px' : 'text-muted-foreground')}>{l}</button>
              ))}
            </div>
            <div className="py-5 text-sm text-muted-foreground leading-relaxed min-h-[80px]">
              {tab === 'desc' && (product.description || 'A signature Vault 26 piece, made for the everyday wardrobe.')}
              {tab === 'mat' && (<><div>{product.material}</div><div className="mt-2">Care: {product.care}</div></>)}
              {tab === 'ship' && (<>Free shipping on orders above ₹999. Dispatched within 24 hours. 7-day easy returns.</>)}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1.5"><Truck className="h-4 w-4" /> Free shipping ₹999+</div>
            <div className="flex flex-col items-center gap-1.5"><RefreshCw className="h-4 w-4" /> 7-day returns</div>
            <div className="flex flex-col items-center gap-1.5"><Shield className="h-4 w-4" /> Secure checkout</div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="display-2 mb-8">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
            {related.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
