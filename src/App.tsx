import { useState, useCallback, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// New route added: accessories
import { motion, AnimatePresence } from "framer-motion";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import StoreLayout from "@/components/layout/StoreLayout";
import Preloader from "@/components/shared/Preloader";
import ErrorBoundary from "@/components/ErrorBoundary";

// ─── Store pages (statically imported for instant back/forward navigation) ──
import Home from "@/pages/Home";
import ProductListing from "@/pages/ProductListing";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import Wishlist from "@/pages/Wishlist";
import Account from "@/pages/Account";
import Lookbook from "@/pages/Lookbook";
import { OrdersList, OrderDetail } from "@/pages/Orders";
import { Login, Register } from "@/pages/Auth";
import Invoice from "@/pages/Invoice";
import AccessoriesPage from "@/pages/Accessories";
import NotFound from "@/pages/NotFound";

// ─── Admin pages (separate "admin" chunk — never loaded for storefront users)
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminRefunds = lazy(() => import("@/pages/admin/AdminRefunds"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminCatalog = lazy(() => import("@/pages/admin/AdminCatalog"));
const AdminCoupons = lazy(() =>
  import("@/pages/admin/AdminMisc").then((m) => ({ default: m.AdminCoupons }))
);
const AdminCustomers = lazy(() =>
  import("@/pages/admin/AdminMisc").then((m) => ({
    default: m.AdminCustomers,
  }))
);
const AdminSettings = lazy(() =>
  import("@/pages/admin/AdminMisc").then((m) => ({ default: m.AdminSettings }))
);
const AdminInvoiceTemplate = lazy(
  () => import("@/pages/admin/AdminInvoiceTemplate")
);
const AdminWhatsApp = lazy(() => import("@/pages/admin/AdminWhatsApp"));
const AdminCMS = lazy(() => import("@/pages/admin/AdminCMS"));

// ─── Query client with sensible cache defaults ───────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white">
      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin mb-3" />
      <span className="text-[10px] tracking-[0.3em] font-ui text-black/40 uppercase">Loading Archive…</span>
    </div>
  );
}

function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

const App = () => {
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem("v26_preloader_seen");
    } catch {
      return false;
    }
  });

  const handlePreloaderComplete = useCallback(() => {
    try {
      sessionStorage.setItem("v26_preloader_seen", "true");
    } catch {}
    setLoading(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <AnimatePresence>
          {loading && <Preloader onComplete={handlePreloaderComplete} />}
        </AnimatePresence>
        <BrowserRouter>
          <RouteErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<StoreLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<ProductListing mode="all" />} />
                <Route
                  path="/category/:slug"
                  element={<ProductListing mode="category" />}
                />
                <Route
                  path="/brand/:slug"
                  element={<ProductListing mode="brand" />}
                />
                <Route
                  path="/search"
                  element={<ProductListing mode="search" />}
                />
                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/lookbook" element={<Lookbook />} />
                <Route path="/accessories" element={<AccessoriesPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route
                  path="/order-success/:id"
                  element={<OrderSuccess />}
                />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/account" element={<Account />} />
                <Route path="/orders" element={<OrdersList />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>
              <Route path="/invoice/:id" element={<Invoice />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="refunds" element={<AdminRefunds />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="catalog" element={<AdminCatalog />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route
                  path="invoice-template"
                  element={<AdminInvoiceTemplate />}
                />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="whatsapp" element={<AdminWhatsApp />} />
                <Route path="cms" element={<AdminCMS />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </RouteErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
