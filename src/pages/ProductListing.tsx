import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import { SlidersHorizontal, X, ChevronDown, Check, ArrowLeft } from 'lucide-react';
import { useSEO } from '@/lib/useSEO';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type Mode = 'category' | 'brand' | 'search' | 'all';

type Cat = { id: string; name: string; slug: string };
type Brand = { id: string; name: string; slug: string };

const SORT_OPTIONS = [
  { value: 'newest', label: 'Latest Drops' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name_asc', label: 'Name: A → Z' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['value'];

export default function ProductListing({ mode }: { mode: Mode }) {
  useSEO({
    title: 'Archive — Shop Vault 26',
    description: 'Browse the latest premium clothing pieces from Vault 26.',
  });
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get('q') || '';

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Shop');
  const [eyebrow, setEyebrow] = useState('Archive');

  // Filters
  const [sort, setSort] = useState<SortKey>('newest');
  const [maxPrice, setMaxPrice] = useState<number>(20000);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Reset filters when navigation context changes
  useEffect(() => {
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setMinPrice(0);
    setMaxPrice(20000);
    setOnSaleOnly(false);
    setInStockOnly(false);
    setActiveCategorySlug(mode === 'category' ? slug ?? null : null);
  }, [mode, slug, q]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: cats }, { data: brs }] = await Promise.all([
        supabase.from('categories').select('id, name, slug').eq('is_active', true).order('name'),
        supabase.from('brands').select('id, name, slug').eq('is_active', true).order('name'),
      ]);
      setCategories(cats || []);
      setBrands(brs || []);

      let query = supabase
        .from('products')
        .select('id, name, slug, images, created_at, brand_id, category_id, brands(name, slug, id), categories(name, slug, id), product_variants(price, compare_price, stock, size, color, color_hex)')
        .eq('is_active', true);

      if (mode === 'category' && slug) {
        const cat = (cats || []).find((c) => c.slug === slug);
        if (cat) { query = query.eq('category_id', cat.id); setTitle(cat.name); setEyebrow('Category Archive'); }
        else { setTitle(slug); setEyebrow('Category Archive'); }
      }
      if (mode === 'brand' && slug) {
        const br = (brs || []).find((b) => b.slug === slug);
        if (br) { query = query.eq('brand_id', br.id); setTitle(br.name); setEyebrow('Brand Archive'); }
      }
      if (mode === 'search') {
        if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
        setTitle(q ? `Results for "${q}"` : 'Search');
        setEyebrow('Search Results');
      }
      if (mode === 'all') {
        setTitle('The Archive');
        setEyebrow('Shop All');
      }

      const { data } = await query.limit(200);
      setAllProducts(data || []);
      setLoading(false);
    })();
  }, [slug, mode, q]);

  // Derive available sizes/colors from current dataset
  const { availableSizes, availableColors } = useMemo(() => {
    const s = new Set<string>();
    const c = new Map<string, string>();
    allProducts.forEach((p: any) => {
      (p.product_variants || []).forEach((v: any) => {
        if (v.size) s.add(v.size);
        if (v.color) c.set(v.color, v.color_hex || '#888');
      });
    });
    return {
      availableSizes: Array.from(s).sort(),
      availableColors: Array.from(c.entries()).map(([name, hex]) => ({ name, hex })),
    };
  }, [allProducts]);

  // Apply filters
  const products: ProductCardData[] = useMemo(() => {
    let list = allProducts.filter((p: any) => {
      const variants = p.product_variants || [];
      const v = variants[0];
      const price = Number(v?.price || 0);
      if (price < minPrice || price > maxPrice) return false;
      if (mode === 'all' && activeCategorySlug && p.categories?.slug !== activeCategorySlug) return false;
      if (selectedBrands.length && !selectedBrands.includes(p.brand_id)) return false;
      if (selectedSizes.length && !variants.some((vv: any) => selectedSizes.includes(vv.size))) return false;
      if (selectedColors.length && !variants.some((vv: any) => selectedColors.includes(vv.color))) return false;
      if (onSaleOnly && !(v?.compare_price && Number(v.compare_price) > price)) return false;
      if (inStockOnly && !variants.some((vv: any) => Number(vv.stock || 0) > 0)) return false;
      return true;
    });

    let mapped: ProductCardData[] = list.map((p: any) => {
      const v = p.product_variants?.[0];
      return {
        id: p.id, slug: p.slug, name: p.name, brand: p.brands?.name,
        images: p.images || [],
        price: Number(v?.price || 0),
        comparePrice: v?.compare_price ? Number(v.compare_price) : null,
      };
    });

    if (sort === 'price_asc') mapped.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') mapped.sort((a, b) => b.price - a.price);
    if (sort === 'name_asc') mapped.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'newest') {
      const order = new Map(allProducts.map((p: any, i) => [p.id, i]));
      mapped.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    return mapped;
  }, [allProducts, sort, minPrice, maxPrice, activeCategorySlug, selectedBrands, selectedSizes, selectedColors, onSaleOnly, inStockOnly, mode]);

  const activeFilterCount =
    selectedBrands.length + selectedSizes.length + selectedColors.length +
    (onSaleOnly ? 1 : 0) + (inStockOnly ? 1 : 0) +
    (minPrice > 0 || maxPrice < 20000 ? 1 : 0);

  const clearFilters = () => {
    setSelectedBrands([]); setSelectedSizes([]); setSelectedColors([]);
    setMinPrice(0); setMaxPrice(20000); setOnSaleOnly(false); setInStockOnly(false);
  };

  const toggle = <T,>(arr: T[], v: T, setter: (v: T[]) => void) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const showCategoryChips = mode === 'all' || mode === 'search';

  return (
    <div className="container-px pt-24 pb-12 md:py-24 min-h-screen bg-white">
      <div className="mb-8 md:mb-12">
        {mode !== 'all' && (
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-ui font-bold text-black/50 hover:text-black transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}
        <span className="eyebrow block mb-3 md:mb-4">{eyebrow}</span>
        <h1 className="display-2 font-elegant font-light uppercase tracking-tight text-3xl md:text-5xl">{title}</h1>
        <p className="text-[10px] md:text-[11px] tracking-[0.2em] font-ui text-black/40 mt-3 md:mt-4 uppercase">
          {products.length} {products.length === 1 ? 'piece' : 'pieces'} found in archive
        </p>
      </div>

      {/* Category Chips (Shop All / Search) */}
      {showCategoryChips && categories.length > 0 && (
        <div className="mb-8 -mx-4 md:mx-0 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-4 md:px-0 min-w-max">
            <button
              onClick={() => setActiveCategorySlug(null)}
              className={cn(
                "px-5 py-2.5 text-[10px] tracking-[0.25em] uppercase font-ui font-bold border transition-all duration-300 whitespace-nowrap",
                !activeCategorySlug
                  ? "bg-black text-white border-black"
                  : "bg-white text-black/80 border-black/30 hover:border-black hover:text-black"
              )}
            >
              All Pieces
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategorySlug(c.slug)}
                className={cn(
                  "px-5 py-2.5 text-[10px] tracking-[0.25em] uppercase font-ui font-bold border transition-all duration-300 whitespace-nowrap",
                  activeCategorySlug === c.slug
                    ? "bg-black text-white border-black"
                    : "bg-white text-black/60 border-black/15 hover:border-black hover:text-black"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-y border-black/5 py-5 mb-12 sticky top-[72px] md:top-[80px] bg-white/95 backdrop-blur-xl z-20">
        <button
          onClick={() => setFiltersOpen(true)}
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-ui font-bold hover:text-accent transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          {activeFilterCount > 0 && (
            <span className="bg-accent text-white h-5 w-5 rounded-full flex items-center justify-center text-[9px]">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Custom Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen((o) => !o)}
            onBlur={() => setTimeout(() => setSortOpen(false), 150)}
            className="flex items-center gap-2 text-[10px] tracking-[0.3em] font-ui font-bold uppercase hover:text-accent transition-colors"
          >
            <span className="hidden md:inline text-black/30 font-light">Sort:</span>
            {SORT_OPTIONS.find((o) => o.value === sort)?.label}
            <ChevronDown className={cn("h-3 w-3 transition-transform", sortOpen && "rotate-180")} />
          </button>
          <AnimatePresence>
            {sortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-3 bg-white border border-black/10 shadow-2xl min-w-[220px] z-30"
              >
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onMouseDown={() => { setSort(o.value); setSortOpen(false); }}
                    className={cn(
                      "w-full text-left px-5 py-3 text-[10px] tracking-[0.25em] uppercase font-ui font-bold transition-colors flex items-center justify-between gap-3",
                      sort === o.value ? "bg-black text-white" : "text-black/70 hover:bg-black/5 hover:text-black"
                    )}
                  >
                    {o.label}
                    {sort === o.value && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active Filter Pills */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {selectedBrands.map((bid) => {
            const b = brands.find((x) => x.id === bid);
            if (!b) return null;
            return (
              <button key={bid} onClick={() => toggle(selectedBrands, bid, setSelectedBrands)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/5 hover:bg-black/10 text-[10px] tracking-[0.2em] uppercase font-ui">
                {b.name} <X className="h-3 w-3" />
              </button>
            );
          })}
          {selectedSizes.map((s) => (
            <button key={s} onClick={() => toggle(selectedSizes, s, setSelectedSizes)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/5 hover:bg-black/10 text-[10px] tracking-[0.2em] uppercase font-ui">
              Size {s} <X className="h-3 w-3" />
            </button>
          ))}
          {selectedColors.map((c) => (
            <button key={c} onClick={() => toggle(selectedColors, c, setSelectedColors)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/5 hover:bg-black/10 text-[10px] tracking-[0.2em] uppercase font-ui">
              {c} <X className="h-3 w-3" />
            </button>
          ))}
          {onSaleOnly && <button onClick={() => setOnSaleOnly(false)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/5 hover:bg-black/10 text-[10px] tracking-[0.2em] uppercase font-ui">On Sale <X className="h-3 w-3" /></button>}
          {inStockOnly && <button onClick={() => setInStockOnly(false)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/5 hover:bg-black/10 text-[10px] tracking-[0.2em] uppercase font-ui">In Stock <X className="h-3 w-3" /></button>}
          {(minPrice > 0 || maxPrice < 20000) && (
            <button onClick={() => { setMinPrice(0); setMaxPrice(20000); }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/5 hover:bg-black/10 text-[10px] tracking-[0.2em] uppercase font-ui">
              ₹{minPrice.toLocaleString('en-IN')} – ₹{maxPrice.toLocaleString('en-IN')} <X className="h-3 w-3" />
            </button>
          )}
          <button onClick={clearFilters} className="text-[10px] tracking-[0.3em] uppercase font-ui font-bold text-accent hover:underline ml-2">
            Clear All
          </button>
        </div>
      )}

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
          <p className="text-sm font-ui font-light tracking-[0.2em] text-black/40 uppercase mb-6">No pieces match — try another filter.</p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-[10px] tracking-[0.3em] uppercase font-ui font-bold border-b border-black pb-1 hover:text-accent hover:border-accent">
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-16">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </motion.div>
      )}

      {/* Filters Drawer */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="fixed right-0 top-0 h-full w-full sm:w-[460px] bg-white z-[70] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-10 pt-10 pb-6 border-b border-black/5">
                <span className="text-[12px] tracking-[0.4em] uppercase font-ui font-bold">Filter Archive</span>
                <button onClick={() => setFiltersOpen(false)} className="hover:rotate-90 transition-transform duration-500">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-10 py-8 space-y-10">
                {/* Price */}
                <div>
                  <div className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold mb-5 text-black/70">Price Range</div>
                  <div className="flex items-center gap-3 mb-4">
                    <input type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                      className="w-full border border-black/10 px-3 py-2 text-sm font-ui focus:border-black outline-none" placeholder="Min" />
                    <span className="text-black/30">—</span>
                    <input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
                      className="w-full border border-black/10 px-3 py-2 text-sm font-ui focus:border-black outline-none" placeholder="Max" />
                  </div>
                  <input type="range" min={0} max={20000} step={500} value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full h-1 bg-black/10 rounded-full appearance-none cursor-pointer accent-accent" />
                  <div className="text-xs font-ui text-black/50 mt-2">Up to ₹{maxPrice.toLocaleString('en-IN')}</div>
                </div>

                {/* Brands */}
                {brands.length > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold mb-4 text-black/70">Brand</div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {brands.map((b) => (
                        <label key={b.id} className="flex items-center gap-3 cursor-pointer group">
                          <span className={cn(
                            "h-4 w-4 border flex items-center justify-center transition-colors",
                            selectedBrands.includes(b.id) ? "bg-black border-black" : "border-black/30 group-hover:border-black"
                          )}>
                            {selectedBrands.includes(b.id) && <Check className="h-3 w-3 text-white" />}
                          </span>
                          <input type="checkbox" className="sr-only" checked={selectedBrands.includes(b.id)}
                            onChange={() => toggle(selectedBrands, b.id, setSelectedBrands)} />
                          <span className="text-sm font-ui text-black/70 group-hover:text-black tracking-wide">{b.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sizes */}
                {availableSizes.length > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold mb-4 text-black/70">Size</div>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((s) => (
                        <button key={s} onClick={() => toggle(selectedSizes, s, setSelectedSizes)}
                          className={cn(
                            "min-w-[44px] h-11 px-3 border text-[11px] tracking-[0.15em] uppercase font-ui font-bold transition-all",
                            selectedSizes.includes(s)
                              ? "bg-black text-white border-black"
                              : "border-black/30 text-black/75 hover:border-black hover:text-black"
                          )}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {availableColors.length > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold mb-4 text-black/70">Color</div>
                    <div className="flex flex-wrap gap-3">
                      {availableColors.map((c) => {
                        const active = selectedColors.includes(c.name);
                        return (
                          <button key={c.name} onClick={() => toggle(selectedColors, c.name, setSelectedColors)}
                            title={c.name}
                            className={cn(
                              "h-9 w-9 rounded-full border-2 transition-all relative",
                              active ? "border-accent ring-2 ring-accent/30 ring-offset-2" : "border-black/10 hover:border-black/40"
                            )}
                            style={{ backgroundColor: c.hex }}>
                            {active && <Check className="h-4 w-4 absolute inset-0 m-auto text-white mix-blend-difference" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Toggles */}
                <div>
                  <div className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold mb-4 text-black/70">Availability</div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <span className={cn(
                        "h-4 w-4 border flex items-center justify-center",
                        onSaleOnly ? "bg-accent border-accent" : "border-black/30 group-hover:border-black"
                      )}>
                        {onSaleOnly && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <input type="checkbox" className="sr-only" checked={onSaleOnly} onChange={(e) => setOnSaleOnly(e.target.checked)} />
                      <span className="text-sm font-ui text-black/70 group-hover:text-black">On Sale</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <span className={cn(
                        "h-4 w-4 border flex items-center justify-center",
                        inStockOnly ? "bg-black border-black" : "border-black/30 group-hover:border-black"
                      )}>
                        {inStockOnly && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <input type="checkbox" className="sr-only" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
                      <span className="text-sm font-ui text-black/70 group-hover:text-black">In Stock Only</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-10 py-6 border-t border-black/5 bg-white">
                <button onClick={clearFilters}
                  className="flex-1 border border-black/30 py-4 text-[11px] tracking-[0.3em] uppercase font-ui font-bold hover:border-black transition-colors">
                  Clear
                </button>
                <button onClick={() => setFiltersOpen(false)}
                  className="flex-[2] bg-black text-white py-4 text-[11px] tracking-[0.3em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500">
                  Show {products.length} Pieces
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
