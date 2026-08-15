"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Headset, ChevronDown, Menu, Store } from "lucide-react";
import { IconShoppingCart } from "@tabler/icons-react";
import { CitySelector } from "./CitySelector";
import { HeaderSearch } from "./HeaderSearch";
import { MobileDrawer } from "./MobileDrawer";
import { getJson } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

interface CategoryNavItem {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
}

export function Header() {
  const [categories, setCategories] = useState<CategoryNavItem[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("919899899150");
  const { itemCount } = useCart();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    getJson<CategoryNavItem[]>("/categories/menu")
      .then(setCategories)
      .catch(() => {
        // Menu API unreachable — nav row simply renders empty, rest of the header still works.
      });
    getJson<{ whatsappNumber: string }>("/settings/contact")
      .then((data) => setWhatsappNumber(data.whatsappNumber))
      .catch(() => {
        // Falls back to the default number set above.
      });
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-(--ink-100) bg-background">
      {/* Top row: hamburger (mobile), logo, city, search (desktop), account/cart */}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-20">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="text-(--ink-700) hover:text-accent md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/logo-2.png" alt="Humsafar Events" width={44} height={44} quality={90} priority className="h-9 w-9 sm:h-12 sm:w-12" />
          <span className="hidden flex-col sm:flex">
            <span className="font-display text-lg font-semibold leading-tight text-primary">
              Humsafar Events
            </span>
            <span className="font-heading text-[10px] font-medium uppercase tracking-[.14em] text-(--orange-600)">
              Together in Every Journey
            </span>
          </span>
        </Link>

        <div className="hidden sm:block">
          <CitySelector onOpen={() => setOpenDropdown(null)} />
        </div>

        <div className="hidden max-w-md flex-1 md:block">
          <HeaderSearch />
        </div>

        <div className="ml-auto flex items-center gap-3 text-(--ink-700) sm:gap-4">
          <Link
            href="/shop"
            className="hidden items-center gap-1.5 rounded-full bg-(--coral-600) px-3.5 py-1.5 font-heading text-sm font-semibold text-white transition-colors hover:bg-(--coral-700,#9c2a48) lg:flex"
          >
            <Store className="h-4 w-4" />
            Shop With Us
          </Link>
          <Link
            href="/contact"
            className="hidden items-center gap-1.5 font-heading text-sm hover:text-accent lg:flex"
          >
            <Headset className="h-4 w-4" />
            Support
          </Link>
          <Link href="/cart" className="relative hover:text-accent" aria-label="Cart">
            <IconShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--coral-600) px-1 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          <Link
            href={isAuthenticated ? "/profile" : "/login"}
            className="flex items-center gap-1.5 font-heading text-sm hover:text-accent"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--coral-600) text-white">
              <User className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">{isAuthenticated ? user?.name || "Profile" : "Sign In"}</span>
          </Link>
        </div>
      </div>

      {/* Mobile-only search row — full width, own line, since it has no room in the top row */}
      <div className="border-t border-(--ink-100) px-4 py-2 md:hidden">
        <HeaderSearch />
      </div>

      {/* Bottom row: desktop category nav, driven by the real category menu API.
          14 categories don't fit one line at most widths, so this wraps onto
          multiple lines (no horizontal scroll) with generous row spacing. */}
      {categories.length > 0 && (
        <nav className="relative z-20 hidden border-t border-(--ink-100) md:block">
          <div className="mx-auto max-w-7xl px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 font-heading text-sm text-foreground">
              {categories.map((cat) => {
                const isOpen = openDropdown === cat.id;
                return (
                  <div
                    key={cat.id}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(cat.id)}
                    onMouseLeave={() => setOpenDropdown((cur) => (cur === cat.id ? null : cur))}
                  >
                    <Link
                      href={`/category/${cat.slug}`}
                      className={`flex items-center gap-1 whitespace-nowrap rounded-full px-1 py-1 transition-colors hover:text-accent ${
                        isOpen ? "text-accent" : ""
                      }`}
                    >
                      {cat.name}
                      {cat.children.length > 0 && (
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      )}
                    </Link>

                    {cat.children.length > 0 && isOpen && (
                      <>
                        {/* Invisible bridge so the pointer can travel from link to panel without the gap closing the menu */}
                        <div className="absolute left-0 top-full h-2 w-full" />
                        <div className="absolute left-1/2 top-[calc(100%+0.5rem)] z-30 max-h-80 w-56 -translate-x-1/2 overflow-y-auto rounded-(--radius-card,16px) border border-(--ink-100) bg-background py-2 shadow-xl">
                          {cat.children.map((child) => (
                            <Link
                              key={child.id}
                              href={`/category/${child.slug}`}
                              className="block whitespace-normal px-4 py-2 font-sans text-sm text-(--ink-700) hover:bg-(--surface-alt,#F7F9FC) hover:text-accent"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categories={categories}
        whatsappNumber={whatsappNumber}
      />
    </header>
  );
}
