"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Phone, Headset } from "lucide-react";

const WHATSAPP_NUMBER = "919899899150";
const PHONE_TEL = "+919899899150";

const HIDDEN_PREFIXES = ["/cart", "/decoration", "/orders"];

const SIDE_ITEMS_LEFT = [
  { href: "/", label: "Home", icon: Home },
  { href: "/#categories", label: "Categories", icon: LayoutGrid },
];

const SIDE_ITEMS_RIGHT = [
  { href: `tel:${PHONE_TEL}`, label: "Call", icon: Phone, external: true },
  { href: "/contact", label: "Support", icon: Headset },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const renderItem = (item: { href: string; label: string; icon: typeof Home; external?: boolean }) => {
    const Icon = item.icon;
    const active = pathname === item.href;
    const content = (
      <span
        className={`flex flex-col items-center gap-1 px-2 py-1 font-sans text-[11px] transition-colors ${
          active ? "text-primary" : "text-(--ink-500)"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        {item.label}
      </span>
    );

    if (item.external) {
      return (
        <a key={item.label} href={item.href}>
          {content}
        </a>
      );
    }

    return (
      <Link key={item.label} href={item.href}>
        {content}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <div className="relative flex items-center justify-between border-t border-(--ink-100) bg-background px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="flex flex-1 items-center justify-around">
          {SIDE_ITEMS_LEFT.map(renderItem)}
        </div>

        {/* Floating WhatsApp button */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="relative -mt-7 flex flex-col items-center gap-1 px-2"
          aria-label="Chat on WhatsApp"
        >
          <span className="flex h-13 w-13 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-background">
            <Image src="/whatsapp.png" alt="WhatsApp" width={40} height={40} className="h-10 w-10" />
          </span>
          <span className="font-sans text-[11px] font-medium text-[#25D366]">WhatsApp</span>
        </a>

        <div className="flex flex-1 items-center justify-around">
          {SIDE_ITEMS_RIGHT.map(renderItem)}
        </div>
      </div>
    </nav>
  );
}
