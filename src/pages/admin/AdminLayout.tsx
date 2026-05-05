import { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import { LayoutDashboard, ShoppingBag, Package, Tag, Users, Settings as SettingsIcon, Ticket, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/coupons', icon: Ticket, label: 'Coupons' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
  { to: '/admin/invoice-template', icon: FileText, label: 'Invoice' },
  { to: '/admin/settings', icon: SettingsIcon, label: 'Settings' },
];

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="p-10">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return (
    <div className="p-10 max-w-lg mx-auto text-center">
      <h1 className="display-2">Admin access required</h1>
      <p className="text-muted-foreground mt-3 text-sm">Your account doesn't have admin privileges. Ask a workspace admin to grant you the admin role.</p>
    </div>
  );
  return (
    <div className="min-h-screen flex bg-secondary">
      <aside className="w-56 bg-sidebar text-sidebar-foreground p-5 hidden md:block">
        <div className="font-display text-lg tracking-[0.15em] uppercase text-sidebar-primary mb-8">Vault 26</div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end as any}
              className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'opacity-75 hover:opacity-100 hover:bg-sidebar-accent/50')}>
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-background p-6 md:p-10 overflow-x-auto"><Outlet /></main>
    </div>
  );
}
