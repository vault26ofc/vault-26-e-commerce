import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Search, User, Menu, X } from 'lucide-react';
import { useCart, useWishlist } from '@/lib/store';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'New', to: '/category/shirts' },
  { label: 'Outerwear', to: '/category/outerwear' },
  { label: 'Shirts', to: '/category/shirts' },
  { label: 'Trousers', to: '/category/trousers' },
  { label: 'Knitwear', to: '/category/knitwear' },
  { label: 'Brands', to: '/brand/vault-noir' },
];

export default function Navbar() {
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const wishCount = useWishlist((s) => s.ids.length);
  const setDrawer = useCart((s) => s.setDrawer);
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [announcement, setAnnouncement] = useState<{ text: string; active: boolean } | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'announcement').maybeSingle().then(({ data }) => {
      if (data?.value) setAnnouncement(data.value as any);
    });
  }, []);

  return (
    <>
      {announcement?.active && bannerVisible && (
        <div className="bg-primary text-primary-foreground text-xs py-2 px-4 flex items-center justify-center gap-3 relative">
          <span className="tracking-wide">{announcement.text}</span>
          <button onClick={() => setBannerVisible(false)} className="absolute right-3 opacity-70 hover:opacity-100"><X className="h-3 w-3" /></button>
        </div>
      )}
      <header className={cn('sticky top-0 z-40 backdrop-blur transition-all', scrolled ? 'bg-background/90 border-b border-border' : 'bg-background/70')}>
        <div className="container-px h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setMobileOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          </div>
          <Link to="/" className="font-display text-xl tracking-[0.15em] uppercase">Vault 26</Link>
          <nav className="hidden lg:flex items-center gap-7 text-sm">
            {NAV.map((n) => (
              <NavLink key={n.label} to={n.to} className={({ isActive }) => cn('link-underline tracking-wide', isActive && 'text-accent')}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={() => setSearchOpen((v) => !v)} aria-label="Search" className="btn-press"><Search className="h-5 w-5" /></button>
            <Link to="/wishlist" aria-label="Wishlist" className="relative btn-press hidden md:block">
              <Heart className="h-5 w-5" />
              {wishCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-accent text-accent-foreground text-[10px] h-4 w-4 rounded-full flex items-center justify-center">{wishCount}</span>}
            </Link>
            <Link to={user ? '/account' : '/login'} aria-label="Account" className="btn-press hidden md:block"><User className="h-5 w-5" /></Link>
            <button onClick={() => setDrawer(true)} aria-label="Cart" className="relative btn-press">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-accent text-accent-foreground text-[10px] h-4 w-4 rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="border-t border-border bg-background">
            <form
              onSubmit={(e) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(q)}`); setSearchOpen(false); }}
              className="container-px py-4 flex items-center gap-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Vault 26…" className="flex-1 bg-transparent outline-none text-sm" />
              <button type="button" onClick={() => setSearchOpen(false)} className="text-xs eyebrow">Close</button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-background animate-fade-up">
          <div className="container-px h-16 flex items-center justify-between border-b border-border">
            <span className="font-display text-xl tracking-[0.15em] uppercase">Vault 26</span>
            <button onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
          </div>
          <nav className="container-px py-8 flex flex-col gap-5 text-2xl font-display">
            {NAV.map((n) => (
              <Link key={n.label} to={n.to} onClick={() => setMobileOpen(false)} className="border-b border-border pb-3">{n.label}</Link>
            ))}
            <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="border-b border-border pb-3">Wishlist</Link>
            <Link to={user ? '/account' : '/login'} onClick={() => setMobileOpen(false)} className="border-b border-border pb-3">{user ? 'Account' : 'Sign in'}</Link>
          </nav>
        </div>
      )}
    </>
  );
}
