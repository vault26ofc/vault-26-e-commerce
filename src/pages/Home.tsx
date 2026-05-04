import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Truck, Shield, RefreshCw, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import { useSEO } from '@/lib/useSEO';

export default function Home() {
  useSEO({
    title: 'Vault 26 — Quiet luxury essentials, made in India',
    description: 'A curated wardrobe of premium minimalist clothing — outerwear, shirts, trousers and knitwear. Free shipping over ₹999.',
    image: 'https://lovable.dev/opengraph-image-p98pqg.png',
    jsonLd: { '@context': 'https://schema.org', '@type': 'Store', name: 'Vault 26', url: typeof window !== 'undefined' ? window.location.origin : '' },
  });
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [byBrand, setByBrand] = useState<Record<string, ProductCardData[]>>({});

  useEffect(() => {
    (async () => {
      const { data: prodRaw } = await supabase
        .from('products').select('id, name, slug, images, brands(name, slug), product_variants(price, compare_price, stock)')
        .eq('is_active', true).order('created_at', { ascending: false }).limit(8);
      const list: ProductCardData[] = (prodRaw || []).map((p: any) => {
        const v = p.product_variants?.[0];
        return { id: p.id, slug: p.slug, name: p.name, brand: p.brands?.name, images: p.images || [], price: Number(v?.price || 0), comparePrice: v?.compare_price ? Number(v.compare_price) : null, isNew: true };
      });
      setProducts(list);

      const { data: br } = await supabase.from('brands').select('*').eq('is_active', true);
      setBrands(br || []);

      const map: Record<string, ProductCardData[]> = {};
      for (const b of br || []) {
        const { data } = await supabase.from('products').select('id, name, slug, images, product_variants(price, compare_price)').eq('brand_id', b.id).limit(8);
        map[b.slug] = (data || []).map((p: any) => {
          const v = p.product_variants?.[0];
          return { id: p.id, slug: p.slug, name: p.name, brand: b.name, images: p.images || [], price: Number(v?.price || 0), comparePrice: v?.compare_price ? Number(v.compare_price) : null };
        });
      }
      setByBrand(map);
    })();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[80vh] min-h-[560px] overflow-hidden bg-primary text-primary-foreground">
        <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80" alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          className="relative z-10 h-full container-px flex flex-col justify-end pb-20 max-w-3xl">
          <span className="eyebrow text-primary-foreground/70">Autumn Edit · 2026</span>
          <h1 className="display-1 mt-3">Quiet luxury, considered for daily wear.</h1>
          <div className="mt-8 flex gap-3">
            <Link to="/category/outerwear" className="bg-background text-foreground px-6 py-3.5 text-xs uppercase tracking-widest hover:bg-accent hover:text-accent-foreground transition-colors btn-press inline-flex items-center gap-2">
              Shop the Edit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/category/shirts" className="border border-primary-foreground/40 px-6 py-3.5 text-xs uppercase tracking-widest hover:bg-primary-foreground hover:text-primary transition-colors btn-press">
              New Arrivals
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Featured collections */}
      <section className="container-px py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="eyebrow">Collections</span>
            <h2 className="display-2 mt-2">Edits to live in.</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {[
            { label: 'Outerwear', slug: 'outerwear', img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800' },
            { label: 'Shirts', slug: 'shirts', img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800' },
            { label: 'Trousers', slug: 'trousers', img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800' },
            { label: 'Knitwear', slug: 'knitwear', img: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800' },
          ].map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="group block relative aspect-[3/4] overflow-hidden bg-muted">
              <img src={c.img} alt={c.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-5 left-5 text-background">
                <div className="font-display text-xl">{c.label}</div>
                <div className="eyebrow text-background/80 mt-1 link-underline">Shop now</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-px py-10">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="eyebrow">Just In</span>
            <h2 className="display-2 mt-2">New arrivals.</h2>
          </div>
          <Link to="/category/shirts" className="hidden md:block text-xs uppercase tracking-widest link-underline">View all</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Brand strips */}
      {brands.map((b) => (
        <section key={b.id} className="container-px py-16 border-t border-border">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="eyebrow">Brand</span>
              <h3 className="font-display text-3xl mt-1">{b.name}</h3>
              {b.description && <p className="text-muted-foreground text-sm mt-1 max-w-md">{b.description}</p>}
            </div>
            <Link to={`/brand/${b.slug}`} className="text-xs uppercase tracking-widest link-underline">Explore</Link>
          </div>
          <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-2">
            {(byBrand[b.slug] || []).map((p) => (
              <div key={p.id} className="w-[230px] md:w-[260px] shrink-0">
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Brand story */}
      <section className="container-px py-24 grid md:grid-cols-2 gap-10 items-center">
        <div className="aspect-[4/5] bg-muted overflow-hidden">
          <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900" alt="" className="w-full h-full object-cover" />
        </div>
        <div>
          <span className="eyebrow">The Vault Story</span>
          <h2 className="display-2 mt-3">Fewer pieces. Better made.</h2>
          <p className="text-muted-foreground mt-5 leading-relaxed">
            Vault 26 is a closet-first label built around essentials with intent. Every garment is sourced from
            small-batch ateliers, finished by hand, and designed to last across decades — not seasons.
          </p>
          <Link to="/brand/vault-noir" className="mt-7 inline-block text-xs uppercase tracking-widest link-underline">Read our philosophy</Link>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-secondary py-10">
        <div className="container-px grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { Icon: Truck, t: 'Free shipping above ₹999' },
            { Icon: RefreshCw, t: 'Easy 7-day returns' },
            { Icon: Shield, t: 'Secure payments' },
            { Icon: Award, t: 'Made in India' },
          ].map(({ Icon, t }) => (
            <div key={t} className="flex flex-col items-center gap-2">
              <Icon className="h-5 w-5 text-accent" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{t}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
