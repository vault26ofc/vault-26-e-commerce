import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';
import { PromoTile } from '@/components/polka/Polka';
import { X, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
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

  const seoDescription =
    mode === 'search' && q ? `Search results for "${q}" on Vault 26 — premium minimalist streetwear.`
    : mode === 'category' ? `Shop ${title} from Vault 26 — curated premium minimalist clothing made in India.`
    : mode === 'brand' ? `Browse the ${title} collection at Vault 26 — premium minimalist streetwear.`
    : 'Browse the full Vault 26 archive — premium minimalist clothing and streetwear, made in India.';

  useSEO({
    title: title ? `${title} — Vault 26` : 'Archive — Shop Vault 26',
    description: seoDescription,
  });

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
  const [page, setPage] = useState(1);

  // Reset filters when navigation context changes
  useEffect(() => {
    setSelectedBrands([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setMinPrice(0);
    setMaxPrice(20000);
    setOnSaleOnly(false);
    setInStockOnly(false);
    setPage(1);
    const categoryParam = params.get('category');
    setActiveCategorySlug(mode === 'category' ? slug ?? null : categoryParam || null);
  }, [mode, slug, q, params]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: cats }, { data: brs }] = await Promise.all([
          supabase.from('categories').select('id, name, slug').eq('is_active', true).order('name'),
          supabase.from('brands').select('id, name, slug').eq('is_active', true).order('name'),
        ]);
        setCategories(cats || []);
        setBrands(brs || []);

        let query = supabase
          .from('products')
          .select('id, name, slug, images, created_at, brand_id, category_id, brands(name, slug, id), categories!products_category_id_fkey(name, slug, id), product_variants(price, compare_price, stock, size, color, color_hex)')
          .eq('is_active', true);

        if (mode === 'category' && slug) {
          const cat = (cats || []).find((c) => c.slug === slug);
          if (cat) {
            // Primary category, or listed here as an extra category.
            const { data: extra } = await supabase.from('product_categories').select('product_id').eq('category_id', cat.id);
            const ids = (extra || []).map((e) => e.product_id);
            query = ids.length ? query.or(`category_id.eq.${cat.id},id.in.(${ids.join(',')})`) : query.eq('category_id', cat.id);
            setTitle(cat.name); setEyebrow('Category Archive');
          }
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
      } catch (e) {
        console.warn('Product list error:', e);
      } finally {
        setLoading(false);
      }
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

  const PAGE_SIZE = 16;
  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const pageItems = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const floatImg = products[0]?.images?.[0];
  const [lead, side, ...others] = pageItems;
  const chipCls = (active: boolean) =>
    cn(
      'h-11 md:h-12 px-5 font-sans text-[14px] md:text-[15px] border transition-colors whitespace-nowrap',
      active ? 'bg-[#BB0006] border-[#BB0006] text-white' : 'bg-white border-[#0F0F0F] text-[#0F0F0F] hover:border-[#BB0006] hover:text-[#BB0006]',
    );
  const pill = 'inline-flex items-center gap-2 h-9 px-3 border border-[#0F0F0F] font-sans text-[13px]';

  return (
    <div className="bg-white min-h-screen pt-[56px] md:pt-[62px]">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-[30px] pb-20">
        {/* Breadcrumb */}
        <nav className="pt-6 md:pt-8 font-sans text-[12px] md:text-[13px] uppercase text-[#0F0F0F]/60" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-[#0F0F0F]">Home</Link>
          <span className="mx-2">/</span>
          {mode !== 'all' && (
            <>
              <Link to="/shop" className="hover:text-[#0F0F0F]">Shop</Link>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="text-[#0F0F0F] underline underline-offset-4">{mode === 'all' ? 'Shop' : title}</span>
        </nav>

        {/* Oversized title with floating product */}
        <div className="relative mt-4 md:mt-6">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-[800] uppercase text-[#0F0F0F] leading-[0.82] text-center break-words text-[clamp(56px,14.5vw,210px)]"
          >
            {title}
          </motion.h1>
          {floatImg && (
            <motion.img
              src={floatImg}
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0, rotate: -4 }}
              animate={{ opacity: 1, y: [0, -8, 0], rotate: -4 }}
              transition={{ opacity: { duration: 0.6, delay: 0.4 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
              className="hidden md:block absolute right-[16%] -top-[8%] w-[7.5%] aspect-[3/4] object-cover shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
            />
          )}
          <p className="text-center font-sans text-[13px] md:text-[14px] text-[#0F0F0F]/60 mt-3">
            {products.length} {products.length === 1 ? 'piece' : 'pieces'}
          </p>
        </div>

        {/* Category chips */}
        {showCategoryChips && categories.length > 0 && (
          <div className="mt-8 md:mt-10 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide">
            <div
              className="flex md:grid gap-2 md:gap-3 min-w-max md:min-w-0"
              style={{ gridTemplateColumns: `repeat(${Math.min(categories.length + 1, 7)}, minmax(0, 1fr))` }}
            >
              <button onClick={() => { setActiveCategorySlug(null); setPage(1); }} className={chipCls(!activeCategorySlug)}>
                All pieces
              </button>
              {categories.map((c) => (
                <button key={c.id} onClick={() => { setActiveCategorySlug(c.slug); setPage(1); }} className={chipCls(activeCategorySlug === c.slug)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter / sort bar */}
        <div className="mt-6 flex items-center justify-between gap-3 border-y border-[#0F0F0F]/70 h-12 md:h-[52px] sticky top-[56px] md:top-[62px] bg-white z-20">
          <button onClick={() => setFiltersOpen(true)} className="inline-flex items-center gap-2 font-sans uppercase text-[13px] md:text-[15px] text-[#0F0F0F] hover:text-[#BB0006]">
            Filter <ChevronDown className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="bg-[#BB0006] text-white h-5 min-w-5 px-1 flex items-center justify-center text-[11px]">{activeFilterCount}</span>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setSortOpen((o) => !o)}
              onBlur={() => setTimeout(() => setSortOpen(false), 150)}
              className="flex items-center gap-2 font-sans uppercase text-[13px] md:text-[15px] text-[#0F0F0F] hover:text-[#BB0006]"
            >
              {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              <ChevronDown className={cn('h-4 w-4 transition-transform', sortOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 bg-white border border-[#0F0F0F] min-w-[230px] z-30"
                >
                  {SORT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onMouseDown={() => { setSort(o.value); setSortOpen(false); setPage(1); }}
                      className={cn(
                        'w-full text-left px-4 h-11 font-sans text-[14px] flex items-center justify-between gap-3',
                        sort === o.value ? 'bg-[#BB0006] text-white' : 'text-[#0F0F0F] hover:bg-[#F1F1F1]',
                      )}
                    >
                      {o.label}
                      {sort === o.value && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-5">
            {selectedBrands.map((bid) => {
              const b = brands.find((x) => x.id === bid);
              if (!b) return null;
              return (
                <button key={bid} onClick={() => toggle(selectedBrands, bid, setSelectedBrands)} className={pill}>
                  {b.name} <X className="h-3.5 w-3.5" />
                </button>
              );
            })}
            {selectedSizes.map((sz) => (
              <button key={sz} onClick={() => toggle(selectedSizes, sz, setSelectedSizes)} className={pill}>
                Size {sz} <X className="h-3.5 w-3.5" />
              </button>
            ))}
            {selectedColors.map((c) => (
              <button key={c} onClick={() => toggle(selectedColors, c, setSelectedColors)} className={pill}>
                {c} <X className="h-3.5 w-3.5" />
              </button>
            ))}
            {onSaleOnly && <button onClick={() => setOnSaleOnly(false)} className={pill}>On sale <X className="h-3.5 w-3.5" /></button>}
            {inStockOnly && <button onClick={() => setInStockOnly(false)} className={pill}>In stock <X className="h-3.5 w-3.5" /></button>}
            {(minPrice > 0 || maxPrice < 20000) && (
              <button onClick={() => { setMinPrice(0); setMaxPrice(20000); }} className={pill}>
                ₹{minPrice.toLocaleString('en-IN')} – ₹{maxPrice.toLocaleString('en-IN')} <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={clearFilters} className="font-sans text-[13px] uppercase text-[#BB0006] underline underline-offset-4 ml-2">Clear all</button>
          </div>
        )}

        <div className="mt-8 md:mt-10">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 md:gap-x-4 gap-y-10">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3 animate-pulse">
                  <div className="aspect-[252/292] bg-[#F1F1F1]" />
                  <div className="h-4 bg-[#F1F1F1] w-3/4" />
                  <div className="h-4 bg-[#F1F1F1] w-1/4" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-32">
              <p className="font-display font-[800] uppercase text-[40px] md:text-[64px] leading-none text-[#0F0F0F]">Nothing here yet</p>
              <p className="font-sans text-[15px] text-[#0F0F0F]/60 mt-3 mb-6">No pieces match these filters.</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="h-12 px-8 bg-[#BB0006] text-white font-sans text-[15px] hover:bg-[#AA0001]">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: 2-col grid */}
              <div className="grid md:hidden grid-cols-2 gap-x-3 gap-y-8">
                {pageItems.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
              {/* Desktop: Polka asymmetric catalogue */}
              <div className="hidden md:grid grid-cols-4 gap-x-4 gap-y-12">
                {lead && (
                  <div className="col-span-2 row-span-2">
                    <ProductCard p={lead} large />
                  </div>
                )}
                <PromoTile className="col-start-3 row-start-1" word="The archive" kicker={`${products.length} pieces`} cta="Browse all" />
                <div className="col-start-4 row-start-1">{side && <ProductCard p={side} />}</div>
                <p className="col-start-3 col-span-2 self-end font-sans text-[15px] leading-relaxed text-[#0F0F0F] max-w-[520px] pb-14">
                  Explore the archive: outerwear, knitwear, denim and essentials. Pick the pieces you will keep coming back to.
                </p>
                {others.map((p, i) => {
                  // Every ninth piece becomes a feature tile, like the Polka catalogue.
                  const feature = i % 9 === 5;
                  return (
                    <div key={p.id} className={feature ? 'col-span-2 row-span-2' : undefined}>
                      <ProductCard p={p} large={feature} />
                    </div>
                  );
                })}
              </div>

              {pageCount > 1 && (
                <div className="mt-14 flex flex-col items-center gap-5">
                  {page < pageCount && (
                    <button onClick={() => setPage(page + 1)} className="font-sans text-[14px] md:text-[15px] uppercase text-[#BB0006] underline underline-offset-4">
                      View more
                    </button>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      aria-label="Previous page"
                      className="w-9 h-9 bg-[#BB0006] text-white flex items-center justify-center disabled:opacity-40"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={cn('font-sans text-[15px] w-6', n === page ? 'text-[#BB0006] font-bold underline underline-offset-4' : 'text-[#0F0F0F]')}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(Math.min(pageCount, page + 1))}
                      disabled={page === pageCount}
                      aria-label="Next page"
                      className="w-9 h-9 bg-[#BB0006] text-white flex items-center justify-center disabled:opacity-40"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
                <span className="font-display font-[800] uppercase text-[32px] leading-none">Filter</span>
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
                              ? "bg-[#BB0006] text-white border-[#BB0006]"
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
                              "h-9 w-9 border-2 transition-all relative",
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
                  className="flex-1 border border-[#0F0F0F] h-12 font-sans text-[15px] hover:border-[#BB0006] hover:text-[#BB0006] transition-colors">
                  Clear
                </button>
                <button onClick={() => setFiltersOpen(false)}
                  className="flex-[2] bg-[#BB0006] text-white h-12 font-sans text-[15px] hover:bg-[#AA0001] transition-colors">
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
