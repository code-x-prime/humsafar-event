import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, ShieldCheck, Truck, Headset } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface FooterCity {
  id: string;
  name: string;
  slug: string;
  isServiceable: boolean;
}

async function getTopCities(): Promise<FooterCity[]> {
  const res = await fetch(`${API_BASE}/cities`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.success) return [];
  const grouped = json.data as Record<string, FooterCity[]>;
  return Object.values(grouped)
    .flat()
    .filter((c) => c.isServiceable)
    .slice(0, 5);
}

const TRUST_BADGES = [
  { icon: ShieldCheck, title: "Secure Payments", subtitle: "Safe & encrypted transactions" },
  { icon: Truck, title: "Delhi NCR · Chandigarh · Jaipur", subtitle: "On-time setup, every time" },
  { icon: Headset, title: "Dedicated Support", subtitle: "Expert help, 7 days a week" },
];

const IMPORTANT_LINKS = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/about", label: "About Us" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
];

const INFO_LINKS = [
  { href: "/contact", label: "Contact Us" },
  { href: "/gallery", label: "Gallery" },
  { href: "/reviews", label: "Reviews" },
  { href: "/faq", label: "FAQ" },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://instagram.com",
    path: "M12 2c2.7 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.22.6 1.77 1.15.55.55.9 1.11 1.15 1.77.25.64.42 1.37.47 2.43.05 1.06.06 1.42.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.77 4.9 4.9 0 0 1-1.77 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.42.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.64-.42-1.37-.47-2.43C2.01 15.06 2 14.7 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.47-2.43.26-.66.6-1.22 1.15-1.77.55-.55 1.11-.9 1.77-1.15.64-.25 1.37-.42 2.43-.47C8.94 2.01 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z",
  },
  {
    label: "Facebook",
    href: "https://facebook.com",
    path: "M13.5 21v-7.5H16l.4-3H13.5V8.4c0-.87.24-1.46 1.5-1.46H16.5V4.34C16.24 4.3 15.36 4.22 14.34 4.22c-2.13 0-3.6 1.3-3.6 3.7v2.58H8.25v3h2.49V21h2.76z",
  },
  {
    label: "X",
    href: "https://x.com",
    path: "M17.53 3h3.16l-6.9 7.89L22 21h-6.36l-4.98-6.5L4.9 21H1.74l7.38-8.44L2 3h6.52l4.5 5.94L17.53 3zm-1.11 16.17h1.75L7.66 4.73H5.78l10.64 14.44z",
  },
  {
    label: "Pinterest",
    href: "https://pinterest.com",
    path: "M12 2C6.48 2 2 6.48 2 12c0 4.24 2.63 7.86 6.35 9.32-.09-.79-.16-2.01.03-2.87.18-.79 1.16-5.02 1.16-5.02s-.3-.6-.3-1.48c0-1.38.8-2.42 1.8-2.42.85 0 1.26.64 1.26 1.4 0 .86-.54 2.14-.83 3.33-.24.99.5 1.8 1.48 1.8 1.77 0 3.14-1.87 3.14-4.56 0-2.38-1.71-4.05-4.16-4.05-2.83 0-4.5 2.12-4.5 4.31 0 .86.33 1.78.74 2.28a.3.3 0 0 1 .07.28c-.08.32-.25 1-.29 1.14-.05.19-.15.23-.35.14-1.3-.6-2.11-2.5-2.11-4.02 0-3.27 2.38-6.28 6.86-6.28 3.6 0 6.4 2.57 6.4 6 0 3.58-2.26 6.46-5.39 6.46-1.05 0-2.04-.55-2.38-1.19l-.65 2.47c-.23.9-.87 2.02-1.29 2.71.98.3 2.01.46 3.08.46 5.52 0 10-4.48 10-10S17.52 2 12 2z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    path: "M4.98 3.5C4.98 4.88 3.9 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.24h4V23h-4V8.24zM8.5 8.24h3.84v2.02h.05c.53-1 1.85-2.06 3.8-2.06 4.07 0 4.82 2.68 4.82 6.16V23h-4v-6.64c0-1.58-.03-3.62-2.2-3.62-2.2 0-2.54 1.72-2.54 3.5V23h-4V8.24z",
  },
];

export async function Footer() {
  const topCities = await getTopCities();

  return (
    <footer className="bg-background pt-8">
      {/* Trust badges */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 divide-y divide-(--ink-100) rounded-(--radius-card,16px) border border-(--ink-100) sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.title} className="flex items-center gap-3 px-6 py-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--coral-100)">
                <badge.icon className="h-5 w-5 text-(--coral-600)" />
              </span>
              <div>
                <p className="font-heading text-sm font-semibold text-(--navy-800)">{badge.title}</p>
                <p className="font-sans text-xs text-(--ink-500)">{badge.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main footer */}
      <div className="mt-8 border-t border-(--ink-100) bg-(--surface-alt,#F7F9FC) pt-12 pb-8 text-(--ink-700)">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/logo-2.png" alt="Humsafar Events" width={44} height={44} className="h-11 w-11" />
              <span className="font-display text-lg text-(--navy-800)">Humsafar Events</span>
            </div>
            <p className="mt-4 max-w-xs font-sans text-sm text-(--ink-500)">
              Premium event decoration booking — together in every journey. Serving Delhi NCR,
              Chandigarh &amp; Jaipur.
            </p>

            <div className="mt-4 flex flex-col gap-2 font-sans text-sm">
              <a href="tel:+919899899150" className="flex items-center gap-2 hover:text-(--orange-600)">
                <Phone className="h-4 w-4 text-(--orange-600)" />
                +91 98998 99150
              </a>
              <a href="mailto:deepakjaat17@yahoo.com" className="flex items-center gap-2 hover:text-(--orange-600)">
                <Mail className="h-4 w-4 text-(--orange-600)" />
                deepakjaat17@yahoo.com
              </a>
            </div>

            <div className="mt-5 flex gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-(--ink-300) text-(--ink-700) hover:border-(--orange-600) hover:text-(--orange-600)"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[.14em] text-(--orange-600)">
              Important Links
            </p>
            <ul className="mt-4 flex flex-col gap-2 font-sans text-sm">
              {IMPORTANT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-(--orange-600)">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {topCities.length > 0 && (
            <div>
              <p className="font-heading text-xs font-semibold uppercase tracking-[.14em] text-(--orange-600)">
                Top Cities
              </p>
              <ul className="mt-4 flex flex-col gap-2 font-sans text-sm">
                {topCities.map((city) => (
                  <li key={city.id}>
                    <Link href={`/locations/${city.slug}`} className="hover:text-(--orange-600)">
                      {city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[.14em] text-(--orange-600)">
              Info
            </p>
            <ul className="mt-4 flex flex-col gap-2 font-sans text-sm">
              {INFO_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-(--orange-600)">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-(--ink-100) px-4 pt-6 text-xs text-(--ink-500) sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans">
            &copy; {new Date().getFullYear()} humsafarevent.com &middot; All Rights Reserved
          </p>
          <p className="font-sans">
            Designed &amp; developed by{" "}
            <a
              href="https://groxmedia.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-(--orange-600) hover:underline"
            >
              Grox Media
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
