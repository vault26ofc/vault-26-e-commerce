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

// Exact Reference Data Structure for Vault 26 Editorial Index
type SectionData = {
  num: string;
  title: string;
  subhead: string;
  heroImage: string;
  categories: {
    num: string;
    heading: string;
    items: { label: string; href: string; hoverImg?: string }[];
  }[];
  thumbnails: {
    num: string;
    label: string;
    type: 'image' | 'video';
    src: string;
  }[];
};

const VAULT_INDEX_DATA: Record<string, SectionData> = {
  MEN: {
    num: '01',
    title: 'MEN',
    subhead: 'MEN / COLLECTION 001\nSPRING / SUMMER 24',
    heroImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=90&w=1400',
    categories: [
      {
        num: '(01)',
        heading: 'NEW IN',
        items: [
          { label: 'THE NEW', href: '/category/men?filter=new', hoverImg: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1200' },
          { label: 'JUST LANDED', href: '/category/men?filter=drop', hoverImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200' },
          { label: 'BEST SELLERS', href: '/category/men?filter=bestsellers', hoverImg: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1200' }
        ]
      },
      {
        num: '(02)',
        heading: 'CLOTHING',
        items: [
          { label: 'T-SHIRTS', href: '/category/men?type=tshirts', hoverImg: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200' },
          { label: 'SHIRTS', href: '/category/men?type=shirts', hoverImg: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=1200' },
          { label: 'TROUSERS', href: '/category/men?type=trousers', hoverImg: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200' },
          { label: 'DENIM', href: '/category/men?type=denim', hoverImg: 'https://images.unsplash.com/photo-1542272604-780c36856842?q=80&w=1200' },
          { label: 'JACKETS', href: '/category/men?type=jackets', hoverImg: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200' },
          { label: 'HOODIES', href: '/category/men?type=hoodies', hoverImg: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1200' },
          { label: 'SWEATERS', href: '/category/men?type=sweaters', hoverImg: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?q=80&w=1200' }
        ]
      },
      {
        num: '(03)',
        heading: 'COLLECTIONS',
        items: [
          { label: 'ESSENTIALS', href: '/category/men?filter=essentials', hoverImg: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200' },
          { label: 'SUMMER EDIT', href: '/category/men?filter=summer', hoverImg: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=1200' },
          { label: 'TAILORED', href: '/category/men?filter=tailored', hoverImg: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1200' },
          { label: 'LIMITED EDIT', href: '/category/men?filter=limited', hoverImg: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200' }
        ]
      }
    ],
    thumbnails: [
      { num: '01', label: 'CAMPAIGN', type: 'image', src: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800' },
      { num: '02', label: 'DETAILS', type: 'image', src: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=800' },
      { num: '03', label: 'LOOKS', type: 'image', src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800' },
      { num: '04', label: 'FILM', type: 'video', src: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-black-jacket-41584-large.mp4' }
    ]
  },
  SHOES: {
    num: '02',
    title: 'SHOES',
    subhead: 'FOOTWEAR ARCHIVE 002\nSPRING / SUMMER 24',
    heroImage: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=90&w=1400',
    categories: [
      {
        num: '(01)',
        heading: 'NEW IN',
        items: [
          { label: 'LATEST DROP', href: '/category/shoes?filter=new', hoverImg: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1200' },
          { label: 'BEST SELLERS', href: '/category/shoes?filter=bestsellers', hoverImg: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1200' }
        ]
      },
      {
        num: '(02)',
        heading: 'MEN & WOMEN',
        items: [
          { label: 'SNEAKERS', href: '/category/shoes?type=sneakers', hoverImg: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1200' },
          { label: 'LOAFERS', href: '/category/shoes?type=loafers', hoverImg: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?q=80&w=1200' },
          { label: 'BOOTS', href: '/category/shoes?type=boots', hoverImg: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=1200' },
          { label: 'SANDALS', href: '/category/shoes?type=sandals', hoverImg: 'https://images.unsplash.com/photo-1562273138-f46be4ebdf33?q=80&w=1200' }
        ]
      },
      {
        num: '(03)',
        heading: 'COLLECTIONS',
        items: [
          { label: 'ESSENTIALS', href: '/category/shoes?filter=essentials' },
          { label: 'STATEMENT', href: '/category/shoes?filter=statement' },
          { label: 'LIMITED EDIT', href: '/category/shoes?filter=limited' }
        ]
      }
    ],
    thumbnails: [
      { num: '01', label: 'CAMPAIGN', type: 'image', src: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800' },
      { num: '02', label: 'DETAILS', type: 'image', src: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800' },
      { num: '03', label: 'LOOKS', type: 'image', src: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?q=80&w=800' },
      { num: '04', label: 'FILM', type: 'video', src: 'https://assets.mixkit.co/videos/preview/mixkit-feet-of-a-person-walking-in-sneakers-42686-large.mp4' }
    ]
  },
  ACCESSORIES: {
    num: '03',
    title: 'ACCESSORIES',
    subhead: 'ACCESSORIES / ATELIER 003\nSPRING / SUMMER 24',
    heroImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=90&w=1400',
    categories: [
      {
        num: '(01)',
        heading: 'NEW IN',
        items: [
          { label: 'LATEST DROP', href: '/category/accessories?filter=new' },
          { label: 'BEST SELLERS', href: '/category/accessories?filter=bestsellers' }
        ]
      },
      {
        num: '(02)',
        heading: 'ESSENTIALS',
        items: [
          { label: 'BAGS', href: '/category/accessories?type=bags', hoverImg: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1200' },
          { label: 'BELTS', href: '/category/accessories?type=belts', hoverImg: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=1200' },
          { label: 'SUNGLASSES', href: '/category/accessories?type=eyewear', hoverImg: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200' },
          { label: 'CAPS', href: '/category/accessories?type=headwear', hoverImg: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=1200' }
        ]
      },
      {
        num: '(03)',
        heading: 'COLLECTIONS',
        items: [
          { label: 'SIGNATURE', href: '/category/accessories?filter=signature' },
          { label: 'LIMITED EDIT', href: '/category/accessories?filter=limited' }
        ]
      }
    ],
    thumbnails: [
      { num: '01', label: 'CAMPAIGN', type: 'image', src: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800' },
      { num: '02', label: 'DETAILS', type: 'image', src: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800' },
      { num: '03', label: 'LOOKS', type: 'image', src: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=800' },
      { num: '04', label: 'FILM', type: 'video', src: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-leather-wallet-41589-large.mp4' }
    ]
  },
  LOOKBOOK: {
    num: '04',
    title: 'LOOKBOOK',
    subhead: 'EDITORIAL ARCHIVE 004\nSPRING / SUMMER 24',
    heroImage: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=90&w=1400',
    categories: [
      {
        num: '(01)',
        heading: 'NEW IN',
        items: [
          { label: 'SPRING / SUMMER 24', href: '/lookbook', hoverImg: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1200' },
          { label: 'THE EVERYDAY EDIT', href: '/lookbook', hoverImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200' }
        ]
      },
      {
        num: '(02)',
        heading: 'CLOTHING',
        items: [
          { label: 'AFTER DARK', href: '/lookbook', hoverImg: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200' },
          { label: 'THE NEW CLASSICS', href: '/lookbook', hoverImg: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1200' }
        ]
      }
    ],
    thumbnails: [
      { num: '01', label: 'CAMPAIGN', type: 'image', src: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=800' },
      { num: '02', label: 'DETAILS', type: 'image', src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800' },
      { num: '03', label: 'LOOKS', type: 'image', src: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800' },
      { num: '04', label: 'FILM', type: 'video', src: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-black-jacket-41584-large.mp4' }
    ]
  },
  ABOUT: {
    num: '05',
    title: 'ABOUT',
    subhead: 'BRAND PHILOSOPHY\nESTABLISHED 2026',
    heroImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=90&w=1400',
    categories: [
      {
        num: '(01)',
        heading: 'THE BRAND',
        items: [
          { label: 'OUR STORY', href: '/about' },
          { label: 'STORES', href: '/about' },
          { label: 'JOURNAL', href: '/about' },
          { label: 'CONTACT', href: '/about' }
        ]
      }
    ],
    thumbnails: [
      { num: '01', label: 'CAMPAIGN', type: 'image', src: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800' },
      { num: '02', label: 'DETAILS', type: 'image', src: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=800' },
      { num: '03', label: 'LOOKS', type: 'image', src: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800' },
      { num: '04', label: 'FILM', type: 'video', src: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-leather-wallet-41589-large.mp4' }
    ]
  }
};

export default function Navbar() {
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const wishCount = useWishlist((s) => s.ids.length);
  const setDrawer = useCart((s) => s.setDrawer);
  const { user } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('MEN');
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
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll behavior: Compact header
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const activeData = VAULT_INDEX_DATA[activeSection] || VAULT_INDEX_DATA['MEN'];
  const currentHeroSrc = hoveredHeroImg || activeData.heroImage;

  return (
    <>
      {/* 01 & 02 — TRANSPARENT CLOSED HEADER */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 bg-transparent transition-all duration-500 ease-out font-sans",
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
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              
              {/* LEFT HALF (45% Width: 2 Inner Navigation Columns with zero text collision) */}
              <div className="w-full lg:w-[45%] px-8 md:px-12 lg:px-14 py-8 flex grid grid-cols-12 gap-6 lg:gap-8 items-start overflow-y-auto">
                
                {/* Col 1: Numbered Primary Sections (7 Cols out of 12 for ample text width) */}
                <div className="col-span-12 sm:col-span-7 space-y-6 lg:space-y-7 pr-2 pt-1">
                  {[
                    { key: 'MEN', num: '01', label: 'MEN' },
                    { key: 'SHOES', num: '02', label: 'SHOES' },
                    { key: 'ACCESSORIES', num: '03', label: 'ACCESSORIES' },
                    { key: 'LOOKBOOK', num: '04', label: 'LOOKBOOK' },
                    { key: 'ABOUT', num: '05', label: 'ABOUT' }
                  ].map((sec) => {
                    const isActive = activeSection === sec.key;

                    return (
                      <div
                        key={sec.key}
                        onMouseEnter={() => {
                          setActiveSection(sec.key);
                          setHoveredHeroImg(null);
                        }}
                        onClick={() => {
                          setActiveSection(sec.key);
                          if (sec.key === 'LOOKBOOK') {
                            navigate('/lookbook');
                            setMenuOpen(false);
                          } else if (sec.key === 'ABOUT') {
                            navigate('/about');
                            setMenuOpen(false);
                          }
                        }}
                        className="cursor-pointer group select-none space-y-1 block"
                      >
                        <span className="text-[10px] font-mono text-black/40 tracking-widest block">
                          {sec.num}
                        </span>
                        <h2
                          className={cn(
                            "text-2xl sm:text-3xl md:text-4xl lg:text-[36px] xl:text-[42px] leading-tight font-serif tracking-[0.02em] uppercase transition-all duration-300 truncate",
                            isActive ? "text-[#111111] font-normal" : "text-black/25 font-light hover:text-[#111111]"
                          )}
                        >
                          {sec.label}
                        </h2>
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
                      {activeData.categories.map((catGroup, idx) => (
                        <div key={catGroup.heading} className="space-y-2.5">
                          {idx > 0 && <div className="h-[1px] w-full bg-black/10 my-3" />}
                          <span className="text-xs font-mono text-black/50 tracking-widest block">
                            {catGroup.num} {catGroup.heading}
                          </span>
                          <ul className="space-y-2">
                            {catGroup.items.map((item) => (
                              <li key={item.label}>
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
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentHeroSrc}
                      initial={{ opacity: 0.7, scale: 1.015 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0.7, scale: 0.985 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      src={currentHeroSrc}
                      alt={activeData.title}
                      className="w-full h-full object-cover"
                    />
                  </AnimatePresence>

                  {/* Monospace Overlay Text Top-Left with dark gradient backdrop for high contrast */}
                  <div className="absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-black/75 via-black/30 to-transparent text-white z-10 space-y-1.5 pointer-events-none drop-shadow-md">
                    <span className="text-[11px] font-mono tracking-widest uppercase block text-white/90 whitespace-pre-line">
                      {activeData.subhead}
                    </span>
                    <div className="w-8 h-[1px] bg-white/60 mt-2" />
                  </div>
                </div>

                {/* Bottom 28% Height: 4 Equal Grid Thumbnails Side-by-Side (01 CAMPAIGN, 02 DETAILS, 03 LOOKS, 04 FILM ▷) */}
                <div className="h-44 md:h-48 grid grid-cols-4 border-t border-white/10 shrink-0 bg-black">
                  {activeData.thumbnails.map((t) => (
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

              {['MEN', 'SHOES', 'ACCESSORIES'].map((key) => {
                const isExpanded = mobileExpanded === key;
                const data = VAULT_INDEX_DATA[key as keyof typeof VAULT_INDEX_DATA];

                return (
                  <div key={key} className="border-b border-black/10 pb-4">
                    <button
                      onClick={() => setMobileExpanded(isExpanded ? null : key)}
                      className="w-full flex items-center justify-between text-2xl font-serif tracking-tight uppercase text-[#111111] cursor-pointer"
                    >
                      <span>{key}</span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && data && (
                      <div className="pt-4 pl-4 space-y-4">
                        {data.categories.map((cat) => (
                          <div key={cat.heading} className="space-y-2">
                            <span className="text-xs font-mono tracking-widest uppercase text-black/50 block">
                              {cat.num} {cat.heading}
                            </span>
                            <div className="space-y-2 pl-2">
                              {cat.items.map((item) => (
                                <Link
                                  key={item.label}
                                  to={item.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="text-sm font-mono tracking-wide text-black/80 block uppercase"
                                >
                                  {item.label}
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
