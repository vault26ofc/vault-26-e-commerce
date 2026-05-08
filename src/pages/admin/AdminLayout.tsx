import { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import { LayoutDashboard, ShoppingBag, Package, Tag, Users, Settings as SettingsIcon, Ticket, FileText, Menu, X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import AdminNotifications from '@/components/admin/AdminNotifications';

const NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/admin/refunds', icon: RotateCcw, label: 'Refunds' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/coupons', icon: Ticket, label: 'Coupons' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
  { to: '/admin/invoice-template', icon: FileText, label: 'Invoice' },
  { to: '/admin/settings', icon: SettingsIcon, label: 'Settings' },
];

const LOGO_URL = "https://res.cloudinary.com/dsqeawg67/image/upload/v1776861404/WhatsApp_Image_2026-04-21_at_23.40.39-removebg-preview_1_ztvyke.png";

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) return <div className="p-10">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return (
    <div className="p-10 max-w-lg mx-auto text-center">
      <h1 className="display-2">Admin access required</h1>
      <p className="text-muted-foreground mt-3 text-sm">Your account doesn't have admin privileges. Ask a workspace admin to grant you the admin role.</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-secondary">
      {/* Mobile Header */}
      <header className="md:hidden bg-sidebar text-sidebar-foreground p-4 flex items-center justify-between border-b border-sidebar-accent/20">
        <img src={LOGO_URL} alt="Vault 26" className="h-8 w-auto brightness-0 invert" />
        <div className="flex items-center gap-1">
          <AdminNotifications />
          <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-sidebar-accent/50 rounded transition-colors">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground p-5 z-[60] md:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <img src={LOGO_URL} alt="Vault 26" className="h-10 w-auto brightness-0 invert" />
                <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-sidebar-accent/50 rounded transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="space-y-1">
                {NAV.map((n) => (
                  <NavLink 
                    key={n.to} 
                    to={n.to} 
                    end={n.end as any}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => cn('flex items-center gap-3 px-3 py-3 text-sm rounded transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'opacity-75 hover:opacity-100 hover:bg-sidebar-accent/50')}
                  >
                    <n.icon className="h-4 w-4" /> {n.label}
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="w-56 bg-sidebar text-sidebar-foreground p-5 hidden md:block border-r border-sidebar-accent/10">
        <div className="mb-10 px-3">
          <img src={LOGO_URL} alt="Vault 26" className="h-12 w-auto brightness-0 invert" />
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end as any}
              className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'opacity-75 hover:opacity-100 hover:bg-sidebar-accent/50')}>
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 bg-background p-4 md:p-10 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
