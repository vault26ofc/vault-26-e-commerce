import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import { SlidersHorizontal, X } from 'lucide-react';
import { useSEO } from '@/lib/useSEO';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'category' | 'brand' | 'search';

export default function ProductListing({ mode }: { mode: Mode }) {
  useSEO({
    title: 'Archive — Shop Vault 26',
    description: 'Browse the latest premium clothing pieces from Vault 26.',
  });
  const { slug } = useParams();
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [maxPrice, setMaxPrice] = useState<number>(20000);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [title, setTitle] = useState('Shop');

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('id, name, slug, images, created_at, brands!inner(name, slug, id), categories(name, slug, id), product_variants(price, compare_price, stock)')
        .eq('is_active', true);

      if (mode === 'category' && slug) {
        const { data: cat } = await supabase.from('categories').select('id, name').eq('slug', slug).maybeSingle();
        if (cat) { query = query.eq('category_id', cat.id); setTitle(cat.name); }
      }
      if (mode === 'brand' && slug) {
        const { data: br } = await supabase.from('brands').select('id, name').eq('slug', slug).maybeSingle();
        if (br) { query = query.eq('brand_id', br.id); setTitle(br.name); }
      }
      if (mode === 'search') {
        if (q) query = query.ilike('name', `%${q}%`);
        setTitle(q ? `Results for “${q}”` : 'Search');
      }

      const { data } = await query.limit(60);
      let list: ProductCardData[] = (data || []).map((p: any) => {
        const v = p.product_variants?.[0];
        return { id: p.id, slug: p.slug, name: p.name, brand: p.brands?.name, images: p.images || [], price: Number(v?.price || 0), comparePrice: v?.compare_price ? Number(v.compare_price) : null };
      });
      list = list.filter((p) => p.price <= maxPrice);
      if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
      if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
      setProducts(list);
      setLoading(false);
    })();
  }, [slug, mode, q, sort, maxPrice]);

  return (
    <div className="container-px py-12 md:py-24 min-h-screen bg-white">
      <div className="mb-8 md:mb-12">
        <span className="eyebrow block mb-3 md:mb-4">{mode === 'brand' ? 'Brand Archive' : mode === 'search' ? 'Search Results' : 'Category Archive'}</span>
        <h1 className="display-2 font-elegant font-light uppercase tracking-tight text-3xl md:text-5xl">{title}</h1>
        <p className="text-[10px] md:text-[11px] tracking-[0.2em] font-ui text-black/40 mt-3 md:mt-4 uppercase">{products.length} {products.length === 1 ? 'piece' : 'pieces'} FOUND IN ARCHIVE</p>
      </div>

      <div className="flex items-center justify-between gap-3 border-y border-black/5 py-6 mb-12 sticky top-[80px] bg-white/90 backdrop-blur-xl z-20">
        <button 
          onClick={() => setFiltersOpen(true)} 
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-ui font-bold hover:text-accent transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-[0.3em] font-ui font-light text-black/30 hidden md:block">SORT BY:</span>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value as any)}
            className="bg-transparent text-[10px] tracking-[0.3em] font-ui font-bold uppercase outline-none cursor-pointer hover:text-accent transition-colors"
          >
            <option value="newest">Latest Drops</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-4 animate-pulse">
              <div className="aspect-[3/4] bg-muted" />
              <div className="h-4 bg-muted w-3/4" />
              <div className="h-4 bg-muted w-1/4" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-40">
           <p className="text-sm font-ui font-light tracking-[0.2em] text-black/40 uppercase">No pieces match — try another filter.</p>
        </div>
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16"
        >
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </motion.div>
      )}

      {/* Filters Sidebar */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" 
              onClick={() => setFiltersOpen(false)} 
            />
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()} 
              className="fixed right-0 top-0 h-full w-full sm:w-[450px] bg-white z-[70] p-10 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-12 border-b border-black/5 pb-8">
                <span className="text-[12px] tracking-[0.4em] uppercase font-ui font-bold">Filter Archive</span>
                <button 
                  onClick={() => setFiltersOpen(false)}
                  className="hover:rotate-90 transition-transform duration-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-12">
                <div>
                  <div className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold mb-6 text-black/40">Maximum Value</div>
                  <input 
                    type="range" 
                    min={500} 
                    max={20000} 
                    step={500} 
                    value={maxPrice} 
                    onChange={(e) => setMaxPrice(Number(e.target.value))} 
                    className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-accent" 
                  />
                  <div className="text-xl font-elegant font-light mt-4 italic">Up to ₹{maxPrice.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <button 
                onClick={() => setFiltersOpen(false)} 
                className="mt-auto bg-black text-white py-5 text-[11px] tracking-[0.4em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500"
              >
                Refine {products.length} Pieces
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

