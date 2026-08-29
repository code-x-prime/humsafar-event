"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { CityProvider } from "@/context/CityContext";
import { CartProvider } from "@/context/CartContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SiteLoader } from "@/components/SiteLoader";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CityProvider>
        <CartProvider>
          <SiteLoader />
          <div className="pb-16 md:pb-0">{children}</div>
          <MobileBottomNav />
          <Toaster position="top-right" richColors closeButton />
        </CartProvider>
      </CityProvider>
    </AuthProvider>
  );
}
