import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import { SlidersHorizontal, X } from 'lucide-react';

type Mode = 'category' | 'brand' | 'search';

export default function ProductListing({ mode }: { mode: Mode }) {
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
    <div className="container-px py-10">
      <div className="mb-8">
        <span className="eyebrow">{mode === 'brand' ? 'Brand' : mode === 'search' ? 'Search' : 'Category'}</span>
        <h1 className="display-2 mt-2">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{products.length} {products.length === 1 ? 'piece' : 'pieces'}</p>
      </div>

      <div className="flex items-center justify-between gap-3 border-y border-border py-3 mb-8 sticky top-16 bg-background/90 backdrop-blur z-20">
        <button onClick={() => setFiltersOpen(true)} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </button>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)}
          className="bg-transparent text-xs uppercase tracking-widest outline-none cursor-pointer">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-muted animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No pieces match — try another filter.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}

      {filtersOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setFiltersOpen(false)}>
          <aside onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full w-full sm:w-[380px] bg-background p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <span className="font-display text-lg">Filters</span>
              <button onClick={() => setFiltersOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div>
              <div className="eyebrow mb-2">Max price</div>
              <input type="range" min={500} max={20000} step={500} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-foreground" />
              <div className="text-sm mt-1">Up to ₹{maxPrice.toLocaleString('en-IN')}</div>
            </div>
            <button onClick={() => setFiltersOpen(false)} className="mt-auto bg-foreground text-background py-3 text-xs uppercase tracking-widest">Show {products.length} pieces</button>
          </aside>
        </div>
      )}
    </div>
  );
}
