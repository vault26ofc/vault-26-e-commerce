import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, ShoppingBasket, User, ArrowRight, ChevronDown, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart, useWishlist } from '@/lib/store';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';
import { cn } from '@/lib/utils';

type Suggestion = { id: string; name: string; slug: string; image: string; price: number; brand?: string };

const LOGO_URL = "https://res.cloudinary.com/dsqeawg67/image/upload/v1776861404/WhatsApp_Image_2026-04-21_at_23.40.39-removebg-preview_1_ztvyke.png";

// Fixed creative element in the mega-menu right-bottom grid — intentionally NOT sourced
// from mega_menu_tabs/groups/links (that schema has no thumbnails column by design; the
// same 4 thumbnails show regardless of which tab is active, per an earlier product decision).
const DEFAULT_THUMBNAILS: { num: string; label: string; type: 'image' | 'video'; src: string }[] = [
  { num: '01', label: 'CAMPAIGN', type: 'image' as const, src: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800' },
  { num: '02', label: 'DETAILS', type: 'image' as const, src: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=800' },
  { num: '03', label: 'LOOKS', type: 'image' as const, src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800' },
  { num: '04', label: 'FILM', type: 'video' as const, src: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-black-jacket-41584-large.mp4' },
];

// Admin-managed mega menu data shape — fetched at mount from mega_menu_tabs/groups/links
// (joined to categories), replacing the old hardcoded VAULT_INDEX_DATA.
type MegaLink = { id: string; label: string; href: string; hoverImg: string | null };
type MegaProduct = { id: string; slug: string; name: string; image: string; price: number };
type MegaGroup = { id: string; heading: string; links: MegaLink[] };
type MegaTab = {
  id: string;
  label: string;
  isCustom: boolean;
  href: string | null; // where clicking the tab goes (category page or fixed page)
  heroImage: string | null;
  subhead: string | null;
  groups: MegaGroup[];
  featured: MegaProduct[];
};

type OverlaySettings = { statement?: string; product_slugs?: string[] };
type Thumb = { num: string; label: string; type: 'image' | 'video'; src: string; href?: string };

export default function Navbar() {
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const wishCount = useWishlist((s) => s.ids.length);
  const setDrawer = useCart((s) => s.setDrawer);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [hideNavbar, setHideNavbar] = useState(location.pathname === '/');
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaTabs, setMegaTabs] = useState<MegaTab[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [hoveredHeroImg, setHoveredHeroImg] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlaySettings>({});
  const [overlayProducts, setOverlayProducts] = useState<Thumb[]>([]);
  const dropdownTimer = useRef<number | null>(null);
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);

  const debounceRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Scroll behavior: Compact header & Hide Navbar until scrolling past Hero on Home page
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setScrolled(currentScroll > 40);

      setHideNavbar(false);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Close overlays on route change
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mega menu (Admin → Mega Menu): tabs → links → up to 2 featured products, plus overlay extras.
  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const [{ data: tabs }, { data: links }, { data: featured }, { data: cats }, { data: overlaySetting }] = await Promise.all([
        db.from('mega_menu_tabs').select('*').eq('is_active', true).order('position'),
        db.from('mega_menu_links').select('*').eq('is_visible', true).order('position'),
        db.from('mega_menu_featured').select('tab_id, position, products(id, slug, name, images, is_active, product_variants(price))').order('position'),
        supabase.from('categories').select('id, name, slug'),
        supabase.from('settings').select('value').eq('key', 'menu_overlay').maybeSingle(),
      ]);
      const ov = ((overlaySetting as any)?.value as OverlaySettings) || {};
      setOverlay(ov);
      if (ov.product_slugs?.length) {
        const { data: ps } = await supabase.from('products').select('slug, name, images').eq('is_active', true).in('slug', ov.product_slugs);
        const bySlug = new Map((ps || []).map((p: any) => [p.slug, p]));
        setOverlayProducts(ov.product_slugs.map((s) => bySlug.get(s)).filter((p: any) => p?.images?.[0]).slice(0, 4)
          .map((p: any, i) => ({ num: String(i + 1).padStart(2, '0'), label: p.name, type: 'image' as const, src: p.images[0], href: `/products/${p.slug}` })));
      }
      const catById = new Map((cats || []).map((c: any) => [c.id, c]));
      const linksByTab = new Map<string, MegaLink[]>();
      (links || []).forEach((l: any) => {
        if (!l.tab_id) return;
        const lc = l.category_id ? catById.get(l.category_id) : null;
        const link: MegaLink = lc
          ? { id: l.id, label: lc.name, href: `/category/${lc.slug}`, hoverImg: l.hover_image_url }
          : { id: l.id, label: l.custom_label || '', href: l.custom_href || '/shop', hoverImg: l.hover_image_url };
        if (!linksByTab.has(l.tab_id)) linksByTab.set(l.tab_id, []);
        linksByTab.get(l.tab_id)!.push(link);
      });
      const featuredByTab = new Map<string, MegaProduct[]>();
      (featured || []).forEach((row: any) => {
        const p = row.products;
        if (!p || !p.is_active) return;
        const price = (p.product_variants || []).reduce((m: number, v: any) => Math.min(m, Number(v.price)), Infinity);
        if (!featuredByTab.has(row.tab_id)) featuredByTab.set(row.tab_id, []);
        featuredByTab.get(row.tab_id)!.push({ id: p.id, slug: p.slug, name: p.name, image: p.images?.[0] || '', price: Number.isFinite(price) ? price : 0 });
      });

      const built: MegaTab[] = (tabs || []).map((t: any) => {
        const cat = t.category_id ? catById.get(t.category_id) : null;
        const label = t.tab_type === 'category' ? (cat?.name?.toUpperCase() || '') : (t.custom_label || '');
        const tabLinks = linksByTab.get(t.id) || [];
        return {
          id: t.id,
          label,
          isCustom: t.tab_type !== 'category',
          href: t.tab_type === 'category' ? (cat ? `/category/${cat.slug}` : null) : t.custom_href,
          heroImage: t.hero_image_url,
          subhead: t.subhead,
          groups: tabLinks.length ? [{ id: `${t.id}-links`, heading: label, links: tabLinks }] : [],
          featured: (featuredByTab.get(t.id) || []).slice(0, 2),
        };
      });
      setMegaTabs(built);
    })();
  }, []);

  // Default the active tab once mega menu data has loaded.
  useEffect(() => {
    if (!activeSection && megaTabs.length) setActiveSection(megaTabs[0].id);
  }, [megaTabs, activeSection]);

  // Live search input suggestions
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 1) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    debounceRef.current = window.setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, images, brands(name), product_variants(price)')
        .eq('is_active', true)
        .or(`name.ilike.%${trimmed}%,description.ilike.%${trimmed}%`)
        .limit(6);
      if (cancelled) return;
      setSuggestions(
        (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: (p.images || [])[0] || '/placeholder.svg',
          price: Number(p.product_variants?.[0]?.price || 0),
          brand: p.brands?.name,
        }))
      );
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  const closeSearch = () => {
    setSearchOpen(false);
    setQ('');
    setSuggestions([]);
  };

  const isHome = location.pathname === '/';
  const activeData = megaTabs.find((t) => t.id === activeSection) || megaTabs[0];
  const fallbackHero = activeData?.groups[0]?.links.find((l) => l.hoverImg)?.hoverImg || null;
  const currentHeroSrc = hoveredHeroImg || activeData?.heroImage || fallbackHero;
  const thumbnails: Thumb[] = overlayProducts.length ? overlayProducts : DEFAULT_THUMBNAILS;
  const dropdownTab = megaTabs.find((t) => t.id === hoveredNav && (t.groups.length || t.featured.length));
  const openDropdown = (id: string) => { if (dropdownTimer.current) window.clearTimeout(dropdownTimer.current); setHoveredNav(id); };
  const closeDropdownSoon = () => { dropdownTimer.current = window.setTimeout(() => setHoveredNav(null), 160); };

  return (
    <>
      {/* 01 — POLKA RED HEADER BAR */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: hideNavbar ? 0 : 1, y: hideNavbar ? -20 : 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 font-sans text-white transition-colors duration-300",
          hideNavbar ? "pointer-events-none" : "pointer-events-auto",
          "bg-[#BB0006]"
        )}
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-[30px]">
          <div
            className={cn(
              "h-14 md:h-[62px] flex items-center justify-between gap-6 border-b transition-colors",
              "border-transparent"
            )}
          >
            {/* Logo (white) — opens the full-screen index */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center h-full shrink-0 cursor-pointer"
              aria-label="Open VAULT 26 index"
            >
              <img
                src={LOGO_URL}
                alt="VAULT 26"
                className="h-9 md:h-11 w-auto object-contain brightness-0 invert hover:opacity-85 transition-opacity"
              />
            </button>

            {/* Centre links — admin-managed mega menu tabs */}
            <nav className="hidden lg:flex items-center gap-8 xl:gap-10 min-w-0" aria-label="Main">
              <Link to="/shop" className="text-[13px] xl:text-[14px] hover:underline underline-offset-4 whitespace-nowrap">
                Shop all
              </Link>
              {megaTabs.slice(0, 6).map((tab) => (
                <button
                  key={tab.id}
                  onMouseEnter={() => openDropdown(tab.id)}
                  onMouseLeave={closeDropdownSoon}
                  onFocus={() => openDropdown(tab.id)}
                  onClick={() => {
                    setHoveredNav(null);
                    if (tab.href) { navigate(tab.href); return; }
                    setActiveSection(tab.id);
                    setHoveredHeroImg(null);
                    setMenuOpen(true);
                  }}
                  className="text-[13px] xl:text-[14px] hover:underline underline-offset-4 whitespace-nowrap lowercase first-letter:uppercase cursor-pointer"
                >
                  {tab.label}
                </button>
              ))}
              <Link to={user ? "/account" : "/login"} className="text-[13px] xl:text-[14px] hover:underline underline-offset-4 whitespace-nowrap">
                {user ? "My account" : "Sign in"}
              </Link>
            </nav>

            {/* Right icons */}
            <div className="flex items-center gap-4 md:gap-5 shrink-0">
              <button
                onClick={() => { setMenuOpen(false); setSearchOpen(true); }}
                className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
                aria-label="Search"
              >
                <Search className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </button>
              <Link to="/wishlist" className="relative p-1 hover:opacity-75 transition-opacity hidden sm:block" aria-label="Wishlist">
                <Heart className="w-[19px] h-[19px]" strokeWidth={1.8} />
                {wishCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-white text-[#BB0006] text-[9px] h-4 min-w-4 px-0.5 flex items-center justify-center font-bold">
                    {wishCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setDrawer(true)}
                className="relative p-1 hover:opacity-75 transition-opacity cursor-pointer"
                aria-label={`Bag, ${cartCount} items`}
              >
                <ShoppingBasket className="w-[20px] h-[20px]" strokeWidth={1.8} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-white text-[#BB0006] text-[9px] h-4 min-w-4 px-0.5 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
              <Link to={user ? "/account" : "/login"} className="p-1 hover:opacity-75 transition-opacity hidden md:block lg:hidden" aria-label="Account">
                <User className="w-[19px] h-[19px]" strokeWidth={1.8} />
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-1 cursor-pointer"
                aria-label="Open menu"
              >
                <span className="block w-6 h-[1.5px] bg-white mb-[6px]" />
                <span className="block w-6 h-[1.5px] bg-white mb-[6px]" />
                <span className="block w-6 h-[1.5px] bg-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Hover dropdown: the tab's links on the left, its 2 featured products on the right */}
        <AnimatePresence>
          {dropdownTab && !menuOpen && (
            <motion.div
              key={dropdownTab.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              onMouseEnter={() => openDropdown(dropdownTab.id)}
              onMouseLeave={closeDropdownSoon}
              className="hidden lg:block absolute left-0 right-0 top-full bg-white text-[#0F0F0F] shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
            >
              <div className="mx-auto w-full max-w-[1440px] px-[30px] py-8 grid grid-cols-[minmax(200px,1fr)_minmax(0,1.6fr)] gap-10">
                <ul className="space-y-3">
                  {dropdownTab.groups.flatMap((g) => g.links).map((l) => (
                    <li key={l.id}>
                      <Link to={l.href} onClick={() => setHoveredNav(null)} className="text-[15px] hover:underline underline-offset-4">{l.label}</Link>
                    </li>
                  ))}
                  {dropdownTab.href && (
                    <li className="pt-2">
                      <Link to={dropdownTab.href} onClick={() => setHoveredNav(null)} className="text-[13px] uppercase text-[#BB0006] underline underline-offset-4">
                        Shop all {dropdownTab.label.toLowerCase()}
                      </Link>
                    </li>
                  )}
                </ul>
                <div className="grid grid-cols-2 gap-4 max-w-[560px] justify-self-end w-full">
                  {dropdownTab.featured.map((p) => (
                    <Link key={p.id} to={`/products/${p.slug}`} onClick={() => setHoveredNav(null)} className="group block">
                      <div className="aspect-[4/5] bg-[#F1F1F1] overflow-hidden">
                        {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-[1.03] transition-transform duration-500" />}
                      </div>
                      <p className="text-[13px] mt-2 truncate">{p.name}</p>
                      <p className="text-[14px] font-bold">{inr(p.price)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* 03 — FULL-SCREEN INDEX OVERLAY (EXACT REFERENCE SCREENSHOT LAYOUT MATCH) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[999] bg-[#BB0006] text-white flex flex-col font-sans select-none overflow-hidden"
          >
            {/* Top Fixed Header Bar */}
            <div className="px-8 md:px-12 py-5 flex items-center justify-between border-b border-white/40 shrink-0 bg-[#BB0006] z-20">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-white hover:opacity-85 transition-opacity cursor-pointer flex items-center gap-4 group"
                  aria-label="Close Index"
                >
                  <span className="text-xl font-light">✕</span>
                  <img
                    src={LOGO_URL}
                    alt="VAULT 26"
                    className="h-10 md:h-14 w-auto object-contain brightness-0 invert"
                  />
                </button>
                <div className="h-4 w-[1px] bg-white/40" />
                <span className="text-[13px] font-sans uppercase text-white/85">
                  THE ARCHIVE / 04
                </span>
              </div>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="h-10 px-5 bg-white text-[#BB0006] text-[14px] font-sans hover:bg-[#F1F1F1] cursor-pointer"
              >
                SEARCH
              </button>
            </div>

            {/* Main Middle 2-Half Canvas (Left 45% Navigation Canvas, Right 55% Full Hero Showcase) */}
            {activeData && (
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

              {/* LEFT HALF (45% Width: 2 Inner Navigation Columns with zero text collision) */}
              <div className="w-full lg:w-[45%] px-8 md:px-12 lg:px-14 py-8 flex grid grid-cols-12 gap-6 lg:gap-8 items-start overflow-y-auto">

                {/* Col 1: Numbered Primary Sections (7 Cols out of 12 for ample text width) */}
                <div className="col-span-12 sm:col-span-7 space-y-6 lg:space-y-7 pr-2 pt-1">
                  {megaTabs.map((sec, idx) => {
                    const isActive = activeSection === sec.id;

                    return (
                      <div
                        key={sec.id}
                        onMouseEnter={() => {
                          setActiveSection(sec.id);
                          setHoveredHeroImg(null);
                        }}
                        onClick={() => {
                          setActiveSection(sec.id);
                          if (sec.isCustom && sec.href) {
                            navigate(sec.href);
                            setMenuOpen(false);
                          }
                        }}
                        className="cursor-pointer group select-none space-y-1 block overflow-hidden py-1"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: '100%' }}
                          animate={{ opacity: 1, y: '0%' }}
                          transition={{ duration: 0.6, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <span className="font-display font-[800] text-[20px] text-white/70 block leading-none">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="relative inline-block">
                            <h2
                              className={cn(
                                "text-2xl sm:text-3xl md:text-4xl lg:text-[36px] xl:text-[42px] leading-[0.9] font-display font-[800] uppercase transition-all duration-300 truncate",
                                isActive ? "text-[#0F0F0F] font-[800]" : "text-black/30 font-light group-hover:text-[#0F0F0F]"
                              )}
                            >
                              {sec.label}
                            </h2>
                            {/* Section 11 & 10: Cherry Red Accent Indicator Line */}
                            <motion.div
                              className="h-[3px] bg-white origin-left absolute -bottom-0.5 left-0 right-0"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: isActive ? 1 : 0 }}
                              whileHover={{ scaleX: 1 }}
                              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>

                {/* Col 2: Category Tree (5 Cols out of 12) */}
                <div className="col-span-12 sm:col-span-5 space-y-5 pt-1 pl-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSection}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-5"
                    >
                      {activeData.groups.map((group, idx) => (
                        <div key={group.id} className="space-y-2.5">
                          {idx > 0 && <div className="h-[1px] w-full bg-white/30 my-3" />}
                          <span className="text-[13px] font-sans uppercase text-white/70 block">
                            {group.heading}
                          </span>
                          <ul className="space-y-2">
                            {group.links.map((item) => (
                              <li key={item.id}>
                                <Link
                                  to={item.href}
                                  onMouseEnter={() => {
                                    if (item.hoverImg) setHoveredHeroImg(item.hoverImg);
                                  }}
                                  onClick={() => setMenuOpen(false)}
                                  className="text-[15px] font-sans text-white hover:underline underline-offset-4 transition-all block truncate"
                                >
                                  {item.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>

              </div>

              {/* RIGHT HALF (55% Width: Full Height Main Hero Showcase + 4 Bottom Grid Thumbnails) */}
              <div className="w-full lg:w-[55%] flex flex-col h-full bg-[#0F0F0F] overflow-hidden relative">

                {/* Top 72% Height: Taller Main Hero Photo Showcase */}
                <div className="relative flex-1 w-full overflow-hidden bg-black">
                  {activeData.featured.length > 0 && !hoveredHeroImg ? (
                    <div className="absolute inset-0 grid grid-cols-2 gap-[2px]">
                      {activeData.featured.map((p) => (
                        <Link key={p.id} to={`/products/${p.slug}`} onClick={() => setMenuOpen(false)} className="relative group overflow-hidden bg-[#F1F1F1]">
                          {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-[1.03] transition-transform duration-500" />}
                          <div className="absolute left-0 right-0 bottom-0 p-4 bg-white/90 text-[#0F0F0F]">
                            <p className="text-[13px] truncate">{p.name}</p>
                            <p className="text-[14px] font-bold">{inr(p.price)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : currentHeroSrc ? (
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentHeroSrc}
                        initial={{ opacity: 0.7, scale: 1.015 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0.7, scale: 0.985 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        src={currentHeroSrc}
                        alt={activeData.label}
                        className="w-full h-full object-cover grayscale contrast-[1.1]"
                      />
                    </AnimatePresence>
                  ) : (
                    // No hero image set on this tab yet and no hover image to fall back to —
                    // a plain neutral block instead of a broken <img>.
                    <div className="w-full h-full bg-[#1a1a1a]" />
                  )}

                  {/* Monospace Overlay Text Top-Left with dark gradient backdrop for high contrast */}
                  <div className="absolute top-0 left-0 right-0 p-8 bg-transparent text-white z-10 space-y-1.5 pointer-events-none drop-shadow-md">
                    <span className="inline-block bg-[#BB0006] px-2 py-1 text-[13px] font-sans uppercase text-white whitespace-pre-line">
                      {activeData.subhead}
                    </span>
                    <div className="hidden" />
                  </div>
                </div>

                {/* Bottom 28% Height: 4 Equal Grid Thumbnails Side-by-Side (01 CAMPAIGN, 02 DETAILS, 03 LOOKS, 04 FILM ▷) — fixed creative element, same regardless of active tab */}
                <div className="h-44 md:h-48 grid grid-cols-4 border-t border-white/10 shrink-0 bg-black">
                  {thumbnails.map((t) => (
                    <div
                      key={t.num + t.label}
                      onMouseEnter={() => {
                        if (t.type === 'image') setHoveredHeroImg(t.src);
                      }}
                      onClick={() => { if (t.href) { setMenuOpen(false); navigate(t.href); } }}
                      className="relative h-full border-r border-white/10 last:border-r-0 group cursor-pointer overflow-hidden"
                    >
                      {t.type === 'video' ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          loop
                          playsInline
                          src={t.src}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500"
                        />
                      ) : (
                        <img
                          src={t.src}
                          alt={t.label}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                      {/* Overlay Monospace Label */}
                      <div className="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between z-10">
                        <div>
                          <span className="font-display font-[800] text-[18px] block text-white leading-none">
                            {t.num}
                          </span>
                          <span className="text-[13px] font-sans uppercase block bg-[#BB0006] px-1.5 py-0.5 mt-1">
                            {t.label}
                          </span>
                        </div>
                        {t.type === 'video' && (
                          <Play className="w-3.5 h-3.5 fill-white text-white opacity-80 group-hover:scale-110 transition-transform" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>
            )}

            {/* Bottom Fixed Footer Bar */}
            <div className="px-8 md:px-12 py-4 flex items-center justify-between border-t border-white/40 shrink-0 bg-[#BB0006] text-[12px] font-sans uppercase text-white/85">
              {/* Left Statement */}
              <div className="leading-tight">
                {(overlay.statement || 'THE ARCHIVE\nIS ALWAYS OPEN').split('\n').map((l, i) => <div key={i}>{l}</div>)}
              </div>

              {/* Center / Right Links */}
              <div className="flex items-center gap-8 text-white">
                <button onClick={() => { setMenuOpen(false); setDrawer(true); }} className="hover:underline underline-offset-4 transition-colors cursor-pointer">
                  BAG ({cartCount})
                </button>
                <Link to={user ? "/account" : "/login"} onClick={() => setMenuOpen(false)} className="hover:underline underline-offset-4 transition-colors">
                  SIGN IN
                </Link>
                <Link to="/about" onClick={() => setMenuOpen(false)} className="hover:underline underline-offset-4 transition-colors">
                  HELP
                </Link>
              </div>

              {/* Far Right Copyright */}
              <div className="text-right leading-tight">
                <div>© VAULT 26</div>
                <div>EST. 2026</div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH OVERLAY */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[120] bg-[#F5F3EE] flex flex-col font-sans"
          >
            {/* Header */}
            <div className="px-8 md:px-16 py-8 flex items-center justify-between border-b border-black/10">
              <Link to="/" onClick={closeSearch} className="flex items-center">
                <img
                  src={LOGO_URL}
                  alt="VAULT 26"
                  className="h-10 md:h-14 w-auto object-contain"
                />
              </Link>
              <button
                onClick={closeSearch}
                className="text-xs font-bold tracking-[0.2em] uppercase text-black/60 hover:text-black transition-colors flex items-center gap-1 cursor-pointer"
              >
                CLOSE <span className="text-lg ml-1">✕</span>
              </button>
            </div>

            {/* Input Form Stage */}
            <div className="px-8 md:px-16 pt-12 pb-8 max-w-4xl w-full mx-auto">
              <motion.span
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-xs font-mono tracking-[0.25em] uppercase text-black/40 block mb-4"
              >
                SEARCH
              </motion.span>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (q.trim()) {
                    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
                    closeSearch();
                  }
                }}
              >
                <motion.input
                  autoFocus
                  initial={{ opacity: 0, scaleX: 0.96 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="What are you looking for?"
                  className="w-full bg-transparent border-b-2 border-black/20 focus:border-black outline-none text-2xl md:text-4xl font-light tracking-tight pb-4 transition-colors placeholder:text-black/25 font-sans"
                />
              </form>

              {/* Trending Suggestions */}
              {q.trim().length < 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="pt-10"
                >
                  <span className="text-xs font-mono tracking-[0.25em] uppercase text-black/40 block mb-4">
                    TRENDING
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {['Oversized Shirts', 'Tailored Jackets', 'New Arrivals', 'Sneakers', 'Accessories'].map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          navigate(`/search?q=${encodeURIComponent(item)}`);
                          closeSearch();
                        }}
                        className="px-5 py-2.5 border border-black/15 text-xs font-mono tracking-[0.2em] uppercase font-medium hover:bg-black hover:text-white transition-all cursor-pointer"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Dynamic Live Suggestions */}
              {q.trim().length >= 1 && (
                <div className="pt-8">
                  {searching ? (
                    <div className="text-xs font-mono tracking-[0.2em] uppercase text-black/40">
                      Searching archive...
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="text-xs font-mono tracking-[0.2em] uppercase text-black/40">
                      No pieces found for "{q}"
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <span className="text-xs font-mono tracking-[0.25em] uppercase text-black/40 block">
                        SUGGESTIONS ({suggestions.length})
                      </span>
                      <div className="grid gap-3">
                        {suggestions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              navigate(`/products/${s.slug}`);
                              closeSearch();
                            }}
                            className="flex items-center gap-5 p-3 hover:bg-[#EAE5DC] transition-colors text-left group border border-black/5 cursor-pointer"
                          >
                            <img src={s.image} alt={s.name} className="h-16 w-16 object-cover bg-muted shrink-0" />
                            <div className="flex-1 min-w-0">
                              {s.brand && <div className="text-[9px] tracking-[0.3em] font-mono font-bold text-black/40 uppercase">{s.brand}</div>}
                              <div className="text-sm font-medium tracking-wide truncate">{s.name}</div>
                              {s.price > 0 && <div className="text-xs font-mono font-bold tracking-widest mt-0.5">{inr(s.price)}</div>}
                            </div>
                            <ArrowRight className="h-4 w-4 text-black/30 group-hover:text-black group-hover:translate-x-1 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE ACCORDION DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[60] bg-[#F5F3EE] flex flex-col font-sans"
          >
            <div className="px-6 py-6 flex items-center justify-between border-b border-black/10">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center">
                <img
                  src={LOGO_URL}
                  alt="VAULT 26"
                  className="h-10 md:h-12 w-auto object-contain"
                />
              </Link>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="cursor-pointer">
                <span className="text-2xl font-light text-black">✕</span>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
              <Link
                to="/shop"
                onClick={() => setMobileOpen(false)}
                className="text-2xl font-serif tracking-tight block uppercase text-[#0F0F0F]"
              >
                SHOP ALL
              </Link>

              {megaTabs.filter((t) => !t.isCustom).map((tab) => {
                const isExpanded = mobileExpanded === tab.id;

                return (
                  <div key={tab.id} className="border-b border-black/10 pb-4">
                    <button
                      onClick={() => setMobileExpanded(isExpanded ? null : tab.id)}
                      className="w-full flex items-center justify-between text-2xl font-serif tracking-tight uppercase text-[#0F0F0F] cursor-pointer"
                    >
                      <span>{tab.label}</span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="pt-4 pl-4 space-y-4">
                        {tab.groups.map((group) => (
                          <div key={group.id} className="space-y-2">
                            <span className="text-xs font-mono tracking-widest uppercase text-black/50 block">
                              {group.heading}
                            </span>
                            <div className="space-y-2 pl-2">
                              {group.links.map((link) => (
                                <Link
                                  key={link.id}
                                  to={link.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="text-sm font-mono tracking-wide text-black/80 block uppercase"
                                >
                                  {link.label}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <Link
                to="/lookbook"
                onClick={() => setMobileOpen(false)}
                className="text-2xl font-serif tracking-tight block uppercase text-[#0F0F0F]"
              >
                LOOKBOOK
              </Link>

              <Link
                to="/about"
                onClick={() => setMobileOpen(false)}
                className="text-2xl font-serif tracking-tight block uppercase text-[#0F0F0F]"
              >
                ABOUT
              </Link>

              <div className="pt-6 border-t border-black/10 space-y-4">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setSearchOpen(true);
                  }}
                  className="text-xs font-mono tracking-widest uppercase text-black/60 block cursor-pointer"
                >
                  SEARCH
                </button>
                <Link
                  to="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="text-xs font-mono tracking-widest uppercase text-black/60 block"
                >
                  BAG ({cartCount})
                </Link>
                <Link
                  to={user ? "/account" : "/login"}
                  onClick={() => setMobileOpen(false)}
                  className="text-xs font-mono tracking-widest uppercase text-black/60 block"
                >
                  {user ? "ACCOUNT" : "SIGN IN"}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
