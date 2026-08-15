"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, User, ChevronRight } from "lucide-react";

interface CategoryNavItem {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
}

const QUICK_LINKS = [
  { href: "/shop", label: "Shop With Us" },
  { href: "/orders", label: "Track Order" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function MobileDrawer({
  open,
  onClose,
  categories,
  whatsappNumber,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryNavItem[];
  whatsappNumber: string;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-sm flex-col overflow-y-auto bg-background shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header band */}
        <div className="relative bg-(--navy-900) px-5 py-6">
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/logo-2.png" alt="Humsafar Events" width={40} height={40} className="h-10 w-10" />
            <div>
              <p className="font-display text-lg text-white">Humsafar Events</p>
              <p className="font-heading text-[10px] uppercase tracking-[.14em] text-(--orange-300)">
                Together in Every Journey
              </p>
            </div>
          </div>
        </div>

        {/* Sign in row */}
        <Link
          href="/login"
          onClick={onClose}
          className="flex items-center gap-3 border-b border-(--ink-100) px-5 py-4 hover:bg-(--surface-alt,#F7F9FC)"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--coral-100) text-(--coral-600)">
            <User className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-heading text-sm font-semibold text-(--navy-800)">Sign In / Register</p>
            <p className="font-sans text-xs text-(--ink-500)">Track orders &amp; exclusive offers</p>
          </div>
          <ChevronRight className="h-4 w-4 text-(--ink-500)" />
        </Link>

        {/* Categories grid */}
        <div className="px-5 py-5">
          <p className="font-heading text-xs font-semibold uppercase tracking-[.14em] text-(--ink-500)">
            Categories
          </p>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                onClick={onClose}
                className="flex flex-col items-center gap-1.5 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-(--orange-100) font-display text-lg font-semibold text-(--orange-600)">
                  {cat.name.charAt(0)}
                </span>
                <span className="font-sans text-[11px] leading-tight text-(--ink-700)">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* WhatsApp support card */}
        <div className="px-5 pb-4">
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-(--radius-card,16px) bg-[#25D366]/10 px-4 py-3 hover:bg-[#25D366]/15"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
              <Image src="/whatsapp.png" alt="WhatsApp" width={22} height={22} className="h-5.5 w-5.5" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold text-(--navy-800)">WhatsApp Support</p>
              <p className="font-sans text-xs text-(--ink-500)">Chat with us instantly</p>
            </div>
          </a>
        </div>

        {/* Quick links */}
        <div className="mt-auto border-t border-(--ink-100) px-5 py-4">
          <div className="flex flex-col gap-1 font-sans text-sm text-(--ink-700)">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="rounded-md px-2 py-2 hover:bg-(--surface-alt,#F7F9FC) hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
