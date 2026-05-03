import { NavLink } from 'react-router-dom';
import { Home, Grid3X3, Search, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/category/shirts', icon: Grid3X3, label: 'Shop' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/wishlist', icon: Heart, label: 'Wishlist' },
  { to: '/account', icon: User, label: 'Account' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-background/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-5">
        {items.map((it) => (
          <NavLink key={it.label} to={it.to} end={it.to === '/'}
            className={({ isActive }) => cn('flex flex-col items-center justify-center py-2.5 text-[10px] gap-1', isActive ? 'text-accent' : 'text-muted-foreground')}>
            <it.icon className="h-4.5 w-4.5" />
            <span className="uppercase tracking-wider">{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
