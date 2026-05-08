import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import { motion } from 'framer-motion';

export default function Wishlist() {
  const { ids } = useWishlist();
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) { setItems([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('products').select('id, name, slug, images, brands(name), product_variants(price, compare_price)').in('id', ids);
      setItems((data || []).map((p: any) => {
        const v = p.product_variants?.[0];
        return { id: p.id, slug: p.slug, name: p.name, brand: p.brands?.name, images: p.images || [], price: Number(v?.price || 0), comparePrice: v?.compare_price ? Number(v.compare_price) : null };
      }));
      setLoading(false);
    })();
  }, [ids]);

  return (
    <div className="container-px py-24 min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="eyebrow block mb-4">Your Curated Collection</span>
        <h1 className="display-2 mb-16">The <span className="italic">Wishlist</span></h1>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-4 animate-pulse">
              <div className="aspect-[3/4] bg-muted" />
              <div className="h-4 bg-muted w-3/4" />
              <div className="h-4 bg-muted w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-black/60 text-sm tracking-[0.2em] uppercase font-ui mb-8">
            The archive is empty.
          </p>
          <Link to="/category/shirts" className="border border-black px-10 py-4 text-[11px] tracking-[0.3em] uppercase font-ui font-bold hover:bg-black hover:text-white transition-all duration-500">
            Explore Pieces
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-16">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <ProductCard p={p} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

