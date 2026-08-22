import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';

type Product = {
  id: string; slug: string; name: string;
  images: string[]; price: number; compare_price?: number | null;
  brand?: string;
};

type Settings = {
  enabled?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta_label?: string;
  cta_href?: string;
};

const DEFAULTS: Settings = {
  enabled: true,
  eyebrow: 'DROP 02 — FRESH',
  title: 'NEW ARRIVALS',
  subtitle: 'Hand-picked drops, fresh in the archive.',
  cta_label: 'Shop New Arrivals',
  cta_href: '/category/new-arrivals',
};

export default function NewArrivals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    (async () => {
      const [{ data: ps }, { data: s }] = await Promise.all([
        supabase
          .from('products')
          .select('id, slug, name, images, brands(name), product_variants(price, compare_price)')
          .eq('is_active', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('settings').select('value').eq('key', 'home_new_arrivals').maybeSingle(),
      ]);
      setProducts(
        (ps || []).map((p: any) => ({
          id: p.id, slug: p.slug, name: p.name,
          images: p.images || [],
          price: Number(p.product_variants?.[0]?.price || 0),
          compare_price: p.product_variants?.[0]?.compare_price ? Number(p.product_variants[0].compare_price) : null,
          brand: p.brands?.name,
        }))
      );
      if (s?.value) setSettings({ ...DEFAULTS, ...(s.value as Settings) });
    })();
  }, []);

  if (settings.enabled === false || products.length === 0) return null;

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-black text-white">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/30 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-white/10 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, white 0 1px, transparent 1px 8px)'
        }} />
      </div>

      {/* Massive watermark */}
      <div className="absolute top-8 right-0 text-[20vw] leading-none text-white/[0.04] font-display font-bold tracking-tighter pointer-events-none select-none">
        NEW
      </div>

      <div className="container-px relative z-10">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14 md:mb-20">
            <div>
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="inline-flex items-center gap-3 text-[10px] tracking-[0.4em] uppercase font-ui font-bold text-accent mb-6"
              >
                <span className="w-8 h-[1px] bg-accent" /> {settings.eyebrow}
              </motion.span>
              <div className="overflow-hidden">
                <motion.h2
                  initial={{ y: '100%' }}
                  whileInView={{ y: '0%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.9] tracking-tighter"
                >
                  {settings.title}
                </motion.h2>
              </div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-5 max-w-md text-sm md:text-base text-white/50 font-ui font-light leading-relaxed"
              >
                {settings.subtitle}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              <Link
                to={settings.cta_href || '/category/new-arrivals'}
                className="group inline-flex items-center gap-3 border border-white/30 hover:border-accent hover:bg-accent px-8 py-4 text-[10px] tracking-[0.3em] uppercase font-ui font-bold transition-all duration-500"
              >
                {settings.cta_label}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12">
            {products.slice(0, 8).map((p, i) => {
              const onSale = p.compare_price && p.compare_price > p.price;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="group"
                >
                  <Link to={`/products/${p.slug}`} className="block">
                    <div className="relative aspect-[3/4] overflow-hidden bg-white/5">
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="absolute top-4 left-4 bg-accent text-white text-[9px] font-ui font-bold uppercase tracking-[0.2em] px-3 py-1.5">
                        New
                      </span>
                      {onSale && (
                        <span className="absolute top-4 right-4 bg-white text-black text-[9px] font-ui font-bold uppercase tracking-[0.2em] px-3 py-1.5">
                          Sale
                        </span>
                      )}
                      <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-ui font-bold text-white">
                          View Piece <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 flex flex-col gap-1">
                      {p.brand && (
                        <div className="text-[10px] tracking-[0.3em] font-ui font-bold text-white/40 uppercase">
                          {p.brand}
                        </div>
                      )}
                      <div className="text-sm font-light tracking-wide text-white/90">{p.name}</div>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-[12px] font-ui font-bold tracking-widest">{inr(p.price)}</span>
                        {onSale && (
                          <span className="text-white/30 line-through text-[10px] font-ui tracking-widest">
                            {inr(p.compare_price!)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
