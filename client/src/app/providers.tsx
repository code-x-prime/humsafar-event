"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { CityProvider } from "@/context/CityContext";
import { CartProvider } from "@/context/CartContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CityProvider>
        <CartProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </CartProvider>
      </CityProvider>
    </AuthProvider>
  );
}
