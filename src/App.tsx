import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// New route added: accessories
import { motion, AnimatePresence } from "framer-motion";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import StoreLayout from "@/components/layout/StoreLayout";
import Preloader from "@/components/shared/Preloader";
import Home from "@/pages/Home";
import ProductListing from "@/pages/ProductListing";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import Wishlist from "@/pages/Wishlist";
import Account from "@/pages/Account";
import { OrdersList, OrderDetail } from "@/pages/Orders";
import { Login, Register } from "@/pages/Auth";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import { AdminCoupons, AdminCustomers, AdminSettings } from "@/pages/admin/AdminMisc";
import AdminInvoiceTemplate from "@/pages/admin/AdminInvoiceTemplate";
import Invoice from "@/pages/Invoice";
import AccessoriesPage from "@/pages/Accessories";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [loading, setLoading] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <AnimatePresence>
          {loading && <Preloader onComplete={() => setLoading(false)} />}
        </AnimatePresence>
        <BrowserRouter>
        <Routes>
          <Route element={<StoreLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/category/:slug" element={<ProductListing mode="category" />} />
            <Route path="/brand/:slug" element={<ProductListing mode="brand" />} />
            <Route path="/search" element={<ProductListing mode="search" />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success/:id" element={<OrderSuccess />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/account" element={<Account />} />
            <Route path="/orders" element={<OrdersList />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/accessories" element={<AccessoriesPage />} />
          </Route>
          <Route path="/invoice/:id" element={<Invoice />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="invoice-template" element={<AdminInvoiceTemplate />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
