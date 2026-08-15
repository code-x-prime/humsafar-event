"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { getJson, postJson, patchJson, deleteJson } from "@/lib/api";
import { useAuth } from "./AuthContext";

interface CartAddOn {
  id: string;
  name: string;
  price: string;
  image: string | null;
}

interface CartProduct {
  id: string;
  title: string;
  slug: string;
  price: string;
  mrp: string | null;
  isActive: boolean;
  media: { url: string }[];
}

interface CartVariant {
  id: string;
  name: string;
  swatches: string[];
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  addOnIds: string[];
  qty: number;
  eventDate: string | null;
  timeSlotId: string | null;
  cityId: string | null;
  notes: string | null;
  product: CartProduct;
  variant: CartVariant | null;
  addOns: CartAddOn[];
}

interface Cart {
  id: string;
  items: CartItem[];
}

interface AddToCartInput {
  productId: string;
  variantId?: string;
  addOnIds?: string[];
  qty?: number;
  cityId?: string;
}

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  subtotal: number;
  loading: boolean;
  addToCart: (input: AddToCartInput) => Promise<void>;
  updateQty: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getJson<Cart>("/cart");
      setCart(data);
    } catch {
      // Cart failed to load — rest of the app still works, just shows empty.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Re-fetch right after login too, since AuthContext's own merge call
    // changes which cart "/cart" resolves to (guest cart -> account cart).
  }, [refresh, isAuthenticated]);

  const addToCart = useCallback(
    async (input: AddToCartInput) => {
      const data = await postJson<Cart>("/cart/items", { qty: 1, ...input });
      setCart(data);
    },
    []
  );

  const updateQty = useCallback(async (itemId: string, qty: number) => {
    const data = await patchJson<Cart>(`/cart/items/${itemId}`, { qty });
    setCart(data);
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const data = await deleteJson<Cart>(`/cart/items/${itemId}`);
    setCart(data);
  }, []);

  const itemCount = useMemo(() => cart?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0, [cart]);

  const subtotal = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => {
      const addOnTotal = item.addOns.reduce((s, a) => s + Number(a.price), 0);
      return sum + (Number(item.product.price) + addOnTotal) * item.qty;
    }, 0);
  }, [cart]);

  const value = useMemo(
    () => ({ cart, itemCount, subtotal, loading, addToCart, updateQty, removeItem, refresh }),
    [cart, itemCount, subtotal, loading, addToCart, updateQty, removeItem, refresh]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
