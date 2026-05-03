import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartLine = {
  variantId: string;
  productId: string;
  name: string;
  brand?: string;
  size?: string | null;
  color?: string | null;
  image: string;
  price: number;
  comparePrice?: number | null;
  quantity: number;
  slug: string;
};

type CartState = {
  items: CartLine[];
  drawerOpen: boolean;
  couponCode: string | null;
  add: (line: CartLine) => void;
  remove: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
  setDrawer: (open: boolean) => void;
  setCoupon: (code: string | null) => void;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      couponCode: null,
      add: (line) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === line.variantId);
          if (existing) {
            return { items: s.items.map((i) => i.variantId === line.variantId ? { ...i, quantity: i.quantity + line.quantity } : i), drawerOpen: true };
          }
          return { items: [...s.items, line], drawerOpen: true };
        }),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      setQty: (variantId, qty) =>
        set((s) => ({ items: qty <= 0 ? s.items.filter((i) => i.variantId !== variantId) : s.items.map((i) => i.variantId === variantId ? { ...i, quantity: qty } : i) })),
      clear: () => set({ items: [], couponCode: null }),
      setDrawer: (open) => set({ drawerOpen: open }),
      setCoupon: (code) => set({ couponCode: code }),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'vault26-cart' }
  )
);

type WishState = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
};

export const useWishlist = create<WishState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => set((s) => ({ ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id] })),
      has: (id) => get().ids.includes(id),
    }),
    { name: 'vault26-wish' }
  )
);
