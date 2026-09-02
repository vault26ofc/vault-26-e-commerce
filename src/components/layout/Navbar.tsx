import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, ShoppingBag, User, ArrowRight, ChevronDown, Play } from 'lucide-react';
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
const FIXED_THUMBNAILS = [
  { num: '01', label: 'CAMPAIGN', type: 'image' as const, src: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800' },
  { num: '02', label: 'DETAILS', type: 'image' as const, src: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=800' },
  { num: '03', label: 'LOOKS', type: 'image' as const, src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800' },
  { num: '04', label: 'FILM', type: 'video' as const, src: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-black-jacket-41584-large.mp4' },
];

// Admin-managed mega menu data shape — fetched at mount from mega_menu_tabs/groups/links
// (joined to categories), replacing the old hardcoded VAULT_INDEX_DATA.
type MegaLink = { id: string; label: string; href: string; hoverImg: string | null };
type MegaGroup = { id: string; heading: string; links: MegaLink[] };
type MegaTab = {
  id: string;
  label: string;
  isCustom: boolean;
  href: string | null; // set only for custom tabs — clicking navigates here
  heroImage: string | null;
  subhead: string | null;
  groups: MegaGroup[];
};

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

  // Fetch mega menu data (tabs, groups, links) from the admin-managed tables on mount.
  useEffect(() => {
    (async () => {
      const [{ data: tabs }, { data: groups }, { data: links }, { data: cats }] = await Promise.all([
        supabase.from('mega_menu_tabs' as any).select('*').eq('is_active', true).order('position'),
        supabase.from('mega_menu_groups' as any).select('*').order('position'),
        supabase.from('mega_menu_links' as any).select('*').order('position'),
        supabase.from('categories').select('id, name, slug'),
      ]);
      const catById = new Map((cats || []).map((c: any) => [c.id, c]));
      const groupsByTab = new Map<string, any[]>();
      (groups || []).forEach((g: any) => {
        if (!groupsByTab.has(g.tab_id)) groupsByTab.set(g.tab_id, []);
        groupsByTab.get(g.tab_id)!.push(g);
      });
      const linksByGroup = new Map<string, any[]>();
      (links || []).forEach((l: any) => {
        if (!linksByGroup.has(l.group_id)) linksByGroup.set(l.group_id, []);
        linksByGroup.get(l.group_id)!.push(l);
      });

      const built: MegaTab[] = (tabs || []).map((t: any) => {
        const cat = t.category_id ? catById.get(t.category_id) : null;
        const tabGroups: MegaGroup[] = (groupsByTab.get(t.id) || []).map((g: any) => ({
          id: g.id,
          heading: g.heading,
          links: (linksByGroup.get(g.id) || []).map((l: any) => {
            if (l.link_type === 'category') {
              const lc = l.category_id ? catById.get(l.category_id) : null;
              return { id: l.id, label: lc?.name || '', href: `/category/${lc?.slug || ''}`, hoverImg: l.hover_image_url };
            }
            return { id: l.id, label: l.custom_label || '', href: l.custom_href || '#', hoverImg: l.hover_image_url };
          }),
        }));
        return {
          id: t.id,
          label: t.tab_type === 'category' ? (cat?.name?.toUpperCase() || '') : (t.custom_label || ''),
          isCustom: t.tab_type === 'custom',
          href: t.tab_type === 'custom' ? t.custom_href : null,
          heroImage: t.hero_image_url,
          subhead: t.subhead,
          groups: tabGroups,
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

  const activeData = megaTabs.find((t) => t.id === activeSection) || megaTabs[0];
  const fallbackHero = activeData?.groups[0]?.links.find((l) => l.hoverImg)?.hoverImg || null;
  const currentHeroSrc = hoveredHeroImg || activeData?.heroImage || fallbackHero;

  return (
    <>
      {/* 01 & 02 — TRANSPARENT CLOSED HEADER */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: hideNavbar ? 0 : 1,
          y: hideNavbar ? -20 : 0
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 bg-transparent transition-all duration-500 ease-out font-sans",
          hideNavbar ? "pointer-events-none opacity-0 -translate-y-6" : "pointer-events-auto opacity-100 translate-y-0",
          scrolled ? "py-3.5 h-16 bg-[#FAF8F5]/85 backdrop-blur-md border-b border-[#111111]/[0.06] shadow-sm" : "py-5 h-20 bg-transparent border-b border-transparent"
        )}
      >
        <div className="px-8 md:px-12 lg:px-[56px] h-full flex items-center justify-between">
          
          {/* Left VAULT 26 Logo (Clicking opens the Full-Screen Editorial Mega Menu Index) */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center h-full group cursor-pointer text-left"
            aria-label="Open VAULT 26 Editorial Index"
          >
            <img
              src={LOGO_URL}
              alt="VAULT 26"
              className={cn(
                "w-auto object-contain hover:opacity-90 transition-all duration-500",
                scrolled ? "h-10 md:h-12 scale-100" : "h-[54px] md:h-[68px] scale-110"
              )}
            />
            <span className="text-[10px] font-mono tracking-widest text-[#111111]/40 hidden sm:inline-block ml-4 pl-4 border-l border-[#111111]/10 uppercase group-hover:text-[#B90F1A] transition-colors">
              INDEX / EST. 2026
            </span>
          </button>

          {/* Right Utility Buttons (SEARCH, ♡, BAG, SIGN IN) with Cherry Red #B90F1A Hover States */}
          <div className="flex items-center gap-7 text-[11px] md:text-[12px] font-sans tracking-widest text-[#111111]">
            {/* SEARCH */}
            <button
              onClick={() => {
                setMenuOpen(false);
                setSearchOpen(true);
              }}
              className="flex items-center gap-2 text-[#111111]/85 hover:text-[#B90F1A] transition-colors duration-200 group cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-[#111111]/85 group-hover:text-[#B90F1A] transition-colors duration-200" strokeWidth={1.5} />
              <span className="hidden md:inline text-[11px] md:text-[12px] tracking-[0.2em] uppercase font-medium font-sans">
                SEARCH
              </span>
            </button>

            {/* WISHLIST ♡ */}
            <Link
              to="/wishlist"
              className="relative flex items-center text-[#111111]/85 hover:text-[#B90F1A] transition-colors duration-200 hidden md:flex group"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4 text-[#111111]/85 group-hover:text-[#B90F1A] transition-colors duration-200" strokeWidth={1.5} />
              {wishCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#B90F1A] text-white text-[9px] h-4 w-4 rounded-full flex items-center justify-center font-bold">
                  {wishCount}
                </span>
              )}
            </Link>

            {/* BAG (0) */}
            <button
              onClick={() => setDrawer(true)}
              className="relative flex items-center gap-2 text-[#111111]/85 hover:text-[#B90F1A] transition-colors duration-200 group cursor-pointer"
              aria-label="Bag"
            >
              <ShoppingBag className="w-4 h-4 text-[#111111]/85 group-hover:text-[#B90F1A] transition-colors duration-200" strokeWidth={1.5} />
              <span className="hidden md:inline text-[11px] md:text-[12px] tracking-[0.2em] uppercase font-medium font-sans">
                BAG ({cartCount})
              </span>
            </button>

            {/* SIGN IN */}
            <Link
              to={user ? "/account" : "/login"}
              className="relative flex items-center gap-2 text-[#111111]/85 hover:text-[#B90F1A] transition-colors duration-200 hidden md:flex"
              aria-label="User Account"
            >
              <User className="w-4 h-4 text-[#111111]/85 hover:text-[#B90F1A] transition-colors duration-200" strokeWidth={1.5} />
              <span className="hidden md:inline text-[11px] md:text-[12px] tracking-[0.2em] uppercase font-medium font-sans">
                {user ? "ACCOUNT" : "SIGN IN"}
              </span>
            </Link>

            {/* MOBILE MENU TOGGLE */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden text-[#111111] p-1 cursor-pointer"
              aria-label="Toggle Navigation"
            >
              <div className="relative w-6 h-6 flex flex-col justify-center items-center">
                <span className={cn("w-6 h-[1.5px] bg-black transition-all duration-300 transform", menuOpen ? "rotate-45 translate-y-[1px]" : "-translate-y-1")} />
                <span className={cn("w-6 h-[1.5px] bg-black transition-all duration-300 transform", menuOpen ? "-rotate-45 -translate-y-[0.5px]" : "translate-y-1")} />
              </div>
            </button>
          </div>
        </div>
      </motion.header>

      {/* 03 — FULL-SCREEN INDEX OVERLAY (EXACT REFERENCE SCREENSHOT LAYOUT MATCH) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[999] bg-[#F5F3EE] flex flex-col font-sans select-none overflow-hidden"
          >
            {/* Top Fixed Header Bar */}
            <div className="px-8 md:px-12 py-5 flex items-center justify-between border-b border-black/10 shrink-0 bg-[#F5F3EE] z-20">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-black hover:opacity-85 transition-opacity cursor-pointer flex items-center gap-4 group"
                  aria-label="Close Index"
                >
                  <span className="text-xl font-light">✕</span>
                  <img
                    src={LOGO_URL}
                    alt="VAULT 26"
                    className="h-10 md:h-14 w-auto object-contain"
                  />
                </button>
                <div className="h-4 w-[1px] bg-black/20" />
                <span className="text-xs font-mono tracking-widest text-black/60 uppercase">
                  THE ARCHIVE / 04
                </span>
              </div>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="text-xs font-mono tracking-[0.25em] uppercase text-[#111111] hover:underline cursor-pointer"
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
                          <span className="text-[10px] font-mono text-black/40 tracking-widest block">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="relative inline-block">
                            <h2
                              className={cn(
                                "text-2xl sm:text-3xl md:text-4xl lg:text-[36px] xl:text-[42px] leading-tight font-serif tracking-[0.02em] uppercase transition-all duration-300 truncate",
                                isActive ? "text-[#111111] font-normal" : "text-black/30 font-light group-hover:text-[#111111]"
                              )}
                            >
                              {sec.label}
                            </h2>
                            {/* Section 11 & 10: Cherry Red Accent Indicator Line */}
                            <motion.div
                              className="h-[1.5px] bg-[#B11226] origin-left absolute -bottom-0.5 left-0 right-0"
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
                          {idx > 0 && <div className="h-[1px] w-full bg-black/10 my-3" />}
                          <span className="text-xs font-mono text-black/50 tracking-widest block">
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
                                  className="text-xs font-mono tracking-widest uppercase text-black/80 hover:text-[#111111] hover:font-bold transition-all block truncate"
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
              <div className="w-full lg:w-[55%] flex flex-col h-full bg-[#111111] border-l border-black/10 overflow-hidden relative">

                {/* Top 72% Height: Taller Main Hero Photo Showcase */}
                <div className="relative flex-1 w-full overflow-hidden bg-black">
                  {currentHeroSrc ? (
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={currentHeroSrc}
                        initial={{ opacity: 0.7, scale: 1.015 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0.7, scale: 0.985 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        src={currentHeroSrc}
                        alt={activeData.label}
                        className="w-full h-full object-cover"
                      />
                    </AnimatePresence>
                  ) : (
                    // No hero image set on this tab yet and no hover image to fall back to —
                    // a plain neutral block instead of a broken <img>.
                    <div className="w-full h-full bg-[#1a1a1a]" />
                  )}

                  {/* Monospace Overlay Text Top-Left with dark gradient backdrop for high contrast */}
                  <div className="absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-black/75 via-black/30 to-transparent text-white z-10 space-y-1.5 pointer-events-none drop-shadow-md">
                    <span className="text-[11px] font-mono tracking-widest uppercase block text-white/90 whitespace-pre-line">
                      {activeData.subhead}
                    </span>
                    <div className="w-8 h-[1px] bg-white/60 mt-2" />
                  </div>
                </div>

                {/* Bottom 28% Height: 4 Equal Grid Thumbnails Side-by-Side (01 CAMPAIGN, 02 DETAILS, 03 LOOKS, 04 FILM ▷) — fixed creative element, same regardless of active tab */}
                <div className="h-44 md:h-48 grid grid-cols-4 border-t border-white/10 shrink-0 bg-black">
                  {FIXED_THUMBNAILS.map((t) => (
                    <div
                      key={t.num + t.label}
                      onMouseEnter={() => {
                        if (t.type === 'image') setHoveredHeroImg(t.src);
                      }}
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
                          <span className="text-[9px] font-mono tracking-widest uppercase block text-white/70">
                            {t.num}
                          </span>
                          <span className="text-xs font-mono tracking-widest uppercase font-bold block">
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
            <div className="px-8 md:px-12 py-4 flex items-center justify-between border-t border-black/10 shrink-0 bg-[#F5F3EE] text-[10px] font-mono tracking-widest uppercase text-black/60">
              {/* Left Statement */}
              <div className="leading-tight">
                <div>THE ARCHIVE</div>
                <div>IS ALWAYS OPEN</div>
              </div>

              {/* Center / Right Links */}
              <div className="flex items-center gap-8 text-black/80">
                <button onClick={() => { setMenuOpen(false); setDrawer(true); }} className="hover:text-black transition-colors cursor-pointer">
                  BAG ({cartCount})
                </button>
                <Link to={user ? "/account" : "/login"} onClick={() => setMenuOpen(false)} className="hover:text-black transition-colors">
                  SIGN IN
                </Link>
                <Link to="/about" onClick={() => setMenuOpen(false)} className="hover:text-black transition-colors">
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
                className="text-2xl font-serif tracking-tight block uppercase text-[#111111]"
              >
                SHOP ALL
              </Link>

              {megaTabs.filter((t) => !t.isCustom).map((tab) => {
                const isExpanded = mobileExpanded === tab.id;

                return (
                  <div key={tab.id} className="border-b border-black/10 pb-4">
                    <button
                      onClick={() => setMobileExpanded(isExpanded ? null : tab.id)}
                      className="w-full flex items-center justify-between text-2xl font-serif tracking-tight uppercase text-[#111111] cursor-pointer"
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
                className="text-2xl font-serif tracking-tight block uppercase text-[#111111]"
              >
                LOOKBOOK
              </Link>

              <Link
                to="/about"
                onClick={() => setMobileOpen(false)}
                className="text-2xl font-serif tracking-tight block uppercase text-[#111111]"
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
