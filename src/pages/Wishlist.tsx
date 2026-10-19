import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllByIds } from '@/lib/fetchAll';
import { PRODUCT_CARD_SELECT, toProductCard } from '@/cms/lib/sectionProducts';
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
      const rows = await fetchAllByIds<any>(ids, (chunk) => supabase.from('products').select(PRODUCT_CARD_SELECT).in('id', chunk).order('id')).catch(() => []);
      const byId = new Map(rows.map((p) => [p.id, p]));
      setItems(ids.map((id) => byId.get(id)).filter(Boolean).map((p: any) => ({ ...toProductCard(p), brand: p.brands?.name })));
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
        <h1 className="uppercase display-2 mb-16">The <span className="">Wishlist</span></h1>
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
          <p className="text-black/60 text-sm tracking-[0.04em] uppercase font-ui mb-8">
            The archive is empty.
          </p>
          <Link to="/category/shirts" className="border border-black px-10 py-4 text-[11px] tracking-[0.04em] uppercase font-ui font-bold hover:bg-[#AA0001] hover:text-white transition-all duration-500">
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

