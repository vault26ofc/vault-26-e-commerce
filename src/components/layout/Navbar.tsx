import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Heart, ShoppingBag, Search, User, Menu, X, ArrowRight } from 'lucide-react';
import { useCart, useWishlist } from '@/lib/store';
import { useAuth } from '@/lib/useAuth';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';

const NAV = [
  { label: 'Shop All', to: '/shop' },
  { label: 'Men', to: '/category/men' },
  { label: 'Women', to: '/category/women' },
  { label: 'Accessories', to: '/category/accessories' },
  { label: 'Lookbook', to: '#lookbook' },
  { label: 'About', to: '#about' },
];

type Suggestion = { id: string; name: string; slug: string; image: string; price: number; brand?: string };

const LOGO_URL = "https://res.cloudinary.com/dsqeawg67/image/upload/v1776861404/WhatsApp_Image_2026-04-21_at_23.40.39-removebg-preview_1_ztvyke.png";

export default function Navbar() {
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const wishCount = useWishlist((s) => s.ids.length);
  const setDrawer = useCart((s) => s.setDrawer);
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const loc = useLocation();
  const isHome = loc.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showGlass = scrolled || !isHome;

  return (
    <>
      <header 
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          showGlass ? 'bg-white/85 backdrop-blur-xl border-b border-black/5 py-4' : 'bg-transparent py-7'
        )}
      >
        <div className="container-px flex items-center justify-between">
          
          {/* Brand */}
          <Link to="/" className="flex items-center h-10 md:h-16 group">
            <img 
              src={LOGO_URL} 
              alt="VAULT 26" 
              className={cn(
                "h-full w-auto object-contain transition-all duration-500",
                showGlass ? "brightness-0" : "brightness-0 invert"
              )}
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-10">
            {NAV.map((n) => {
              const isHash = n.to.startsWith('#');
              return (
                <NavLink 
                  key={n.label} 
                  to={isHash && isHome ? n.to : isHash ? `/${n.to}` : n.to}
                  onClick={(e) => {
                    if (isHash && isHome) {
                      e.preventDefault();
                      const el = document.querySelector(n.to);
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={({ isActive }) => cn(
                    "relative text-[12px] font-ui font-light tracking-[0.25em] uppercase transition-colors duration-300 group py-1",
                    showGlass ? "text-black/60 hover:text-black" : "text-white/80 hover:text-white",
                    isActive && !isHash && (showGlass ? "text-black" : "text-white")
                  )}
                >
                  {n.label}
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-accent group-hover:w-full transition-all duration-400" />
                </NavLink>
              );
            })}
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSearchOpen(true)}
              className={cn(
                "flex items-center gap-2 transition-colors duration-300 group",
                showGlass ? "text-black/60 hover:text-black" : "text-white/70 hover:text-white"
              )}
              aria-label="Search"
            >
              <Search className="w-4 h-4" strokeWidth={1.5} />
              <span className="hidden md:inline text-[10px] tracking-[0.2em] uppercase font-light font-ui">Search</span>
            </button>

            <div className={cn("hidden md:block w-[1px] h-4 transition-colors duration-500", showGlass ? "bg-black/10" : "bg-white/20")} />

            <Link 
              to="/wishlist" 
              className={cn(
                "relative flex items-center gap-2 transition-colors duration-300 hidden md:flex",
                showGlass ? "text-black/60 hover:text-black" : "text-white/70 hover:text-white"
              )}
            >
              <Heart className="w-4 h-4" strokeWidth={1.5} />
              {wishCount > 0 && <span className="absolute -top-1 -right-1 bg-accent text-white text-[8px] h-3 w-3 rounded-full flex items-center justify-center font-bold">{wishCount}</span>}
            </Link>

            <button 
              onClick={() => setDrawer(true)}
              className={cn(
                "relative flex items-center gap-2 transition-colors duration-300",
                showGlass ? "text-black/60 hover:text-black" : "text-white/70 hover:text-white"
              )}
              aria-label="Bag"
            >
              <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
              <span className="hidden md:inline text-[10px] tracking-[0.2em] uppercase font-light font-ui">Bag</span>
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-accent text-white text-[8px] h-3 w-3 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
            </button>

            <Link 
              to={user ? "/account" : "/login"} 
              className={cn(
                "relative flex items-center gap-2 transition-colors duration-300 hidden md:flex",
                showGlass ? "text-black/60 hover:text-black" : "text-white/70 hover:text-white"
              )}
              aria-label="User Account"
            >
              <User className="w-4 h-4" strokeWidth={1.5} />
              <span className="hidden md:inline text-[10px] tracking-[0.2em] uppercase font-light font-ui">
                {user ? "Account" : "Sign In"}
              </span>
            </Link>

            <button 
              onClick={() => setMobileOpen(true)} 
              className={cn("lg:hidden transition-colors", showGlass ? "text-black" : "text-white")}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search Overlay */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 bg-white z-[60] flex items-center px-6 lg:px-20"
            >
              <Search className="w-5 h-5 text-black/30" />
              <form 
                className="flex-1 h-full"
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  if (q.trim()) {
                    navigate(`/search?q=${encodeURIComponent(q.trim())}`); 
                    setSearchOpen(false); 
                    setQ('');
                  }
                }}
              >
                <input 
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="SEARCH THE ARCHIVE..." 
                  className="w-full h-full bg-transparent border-none outline-none text-[12px] tracking-[0.3em] px-6 font-ui font-bold uppercase"
                />
              </form>
              <button 
                onClick={() => setSearchOpen(false)} 
                className="text-[10px] tracking-[0.2em] font-ui uppercase font-bold text-black/40 hover:text-accent transition-colors"
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </header>



      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[60] bg-white flex flex-col"
          >
            <div className="container-px py-7 flex items-center justify-between border-b border-black/5">
              <img src={LOGO_URL} alt="VAULT 26" className="h-10 w-auto brightness-0" />
              <button onClick={() => setMobileOpen(false)}><X className="w-6 h-6" /></button>
            </div>
            <nav className="container-px py-12 flex flex-col gap-8">
              {NAV.map((n) => (
                <Link 
                  key={n.label} 
                  to={n.to} 
                  onClick={() => setMobileOpen(false)}
                  className="text-4xl font-display font-light tracking-tight hover:text-accent transition-colors"
                >
                  {n.label}
                </Link>
              ))}
              <div className="h-px bg-black/5 my-4" />
              <Link to={user ? "/account" : "/login"} onClick={() => setMobileOpen(false)} className="text-[11px] tracking-[0.4em] uppercase font-ui font-light text-black/40">{user ? "Account" : "Sign In"}</Link>
              <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="text-[11px] tracking-[0.4em] uppercase font-ui font-light text-black/40">Wishlist</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

