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
    <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden bg-white/80 backdrop-blur-xl border-t border-black/10 pb-2">
      <div className="grid grid-cols-5 h-16">
        {items.map((it) => (
          <NavLink 
            key={it.label} 
            to={it.to} 
            end={it.to === '/'}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-1 transition-all duration-300 relative h-full', 
              isActive ? 'text-accent' : 'text-black/50 hover:text-black'
            )}
          >
            {({ isActive }) => (
              <>
                <it.icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[9px] font-ui font-bold uppercase tracking-[0.2em]">{it.label}</span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

