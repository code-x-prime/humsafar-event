import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  HeartHandshake,
  ShieldCheck,
  Clock,
  MapPin,
  PartyPopper,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TestimonialsCarousel, type Testimonial } from "@/components/TestimonialsCarousel";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const WHATSAPP_NUMBER = "919899899150";

interface CityRow {
  id: string;
  name: string;
  slug: string;
  isServiceable: boolean;
}

async function getCities(): Promise<CityRow[]> {
  try {
    const res = await fetch(`${API_BASE}/cities`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success) return [];
    return Object.values(json.data as Record<string, CityRow[]>).flat();
  } catch {
    return [];
  }
}

async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${API_BASE}/testimonials`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: "About Us | Humsafar Events",
  description:
    "Humsafar Events brings premium birthday, anniversary and celebration decorations to your doorstep — trusted setup, on-time delivery, together in every journey.",
};

const VALUES = [
  {
    icon: Sparkles,
    title: "Crafted With Care",
    body: "Every setup is planned and styled by our decor team — nothing off-the-shelf, nothing rushed.",
  },
  {
    icon: Clock,
    title: "On-Time, Every Time",
    body: "We arrive, set up, and clear out on schedule, so your celebration starts exactly when it should.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted & Secure",
    body: "Transparent pricing, secure payments, and a support team that's a message away if anything needs sorting.",
  },
  {
    icon: HeartHandshake,
    title: "Made For Your Moment",
    body: "From an intimate baby shower to a full wedding entrance, we tailor every detail to the occasion.",
  },
];

export default async function AboutPage() {
  const [cities, testimonials] = await Promise.all([getCities(), getTestimonials()]);
  const serviceableCities = cities.filter((c) => c.isServiceable);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-(--ink-100) bg-(--surface-warm,#FFF9F2) px-4 py-16 text-center sm:py-24">
          <p className="flex items-center justify-center gap-1.5 font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
            <PartyPopper className="h-3.5 w-3.5" />
            About Humsafar Events
          </p>
          <h1 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight text-(--navy-800) sm:text-5xl">
            Together in every journey, celebrating every moment
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-sans text-sm text-(--ink-500) sm:text-base">
            We design and set up premium decorations for birthdays, anniversaries, baby showers and more —
            so you can focus on the people you&apos;re celebrating with, not the setup.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/categories"
              className="rounded-full bg-primary px-7 py-3 font-heading text-sm font-semibold text-primary-foreground"
            >
              Explore Decorations
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-(--ink-300) px-7 py-3 font-heading text-sm font-semibold text-(--navy-800) hover:border-(--orange-400)"
            >
              <Image src="/whatsapp.png" alt="" width={18} height={18} quality={90} className="h-4.5 w-4.5" />
              Chat With Us
            </a>
          </div>
        </section>

        {/* Story */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
                Our Story
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-(--navy-800) sm:text-3xl">
                A decoration partner you can actually rely on
              </h2>
              <p className="mt-4 font-sans text-sm leading-relaxed text-(--ink-700) sm:text-base">
                Humsafar Events started with a simple frustration — booking a decorator shouldn&apos;t feel like a
                gamble. So we built a platform where every package is priced upfront, every setup is handled
                by a vetted team, and every booking is tracked from confirmation to clean-up.
              </p>
              <p className="mt-3 font-sans text-sm leading-relaxed text-(--ink-700) sm:text-base">
                Today we help families and businesses across {serviceableCities.length > 0 ? serviceableCities.length : "multiple"}{" "}
                {serviceableCities.length === 1 ? "city" : "cities"} celebrate birthdays, anniversaries,
                baby showers, weddings and corporate events — with the same care every single time.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-(--radius-card,24px) border border-(--ink-100) bg-(--surface-warm,#FFF9F2)">
              <Image
                src="/logo-2.png"
                alt="Humsafar Events"
                fill
                quality={90}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-16 opacity-80"
              />
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-t border-(--ink-100) bg-(--surface-alt,#F7F9FC) px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
                Why Humsafar
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-(--navy-800) sm:text-3xl">
                What makes us different
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((v) => (
                <div
                  key={v.title}
                  className="rounded-(--radius-card,20px) border border-(--ink-100) bg-white p-6 shadow-[0_2px_8px_rgba(11,22,32,0.05)] transition-shadow hover:shadow-[0_16px_32px_rgba(14,42,77,0.1)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-(--coral-100)">
                    <v.icon className="h-5 w-5 text-(--coral-600)" strokeWidth={1.75} />
                  </span>
                  <p className="mt-4 font-heading text-sm font-semibold text-(--navy-800)">{v.title}</p>
                  <p className="mt-1.5 font-sans text-sm leading-relaxed text-(--ink-500)">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cities served */}
        {serviceableCities.length > 0 && (
          <section className="px-4 py-14 sm:py-20">
            <div className="mx-auto max-w-5xl text-center">
              <p className="flex items-center justify-center gap-1.5 font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
                <MapPin className="h-3.5 w-3.5" />
                Where We Deliver
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-(--navy-800) sm:text-3xl">
                Serving celebrations across {serviceableCities.length} {serviceableCities.length === 1 ? "city" : "cities"}
              </h2>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {serviceableCities.map((city) => (
                  <Link
                    key={city.id}
                    href={`/locations/${city.slug}`}
                    className="rounded-full border border-(--ink-300) bg-white px-5 py-2 font-heading text-sm font-semibold text-(--navy-800) transition-colors hover:border-(--orange-400) hover:text-(--orange-600)"
                  >
                    {city.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {testimonials.length > 0 && <TestimonialsCarousel testimonials={testimonials} />}

        {/* CTA */}
        <section className="border-t border-(--ink-100) bg-(--navy-900) px-4 py-16 text-center sm:py-20">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Ready to plan your celebration?
          </h2>
          <p className="mx-auto mt-3 max-w-md font-sans text-sm text-white/70">
            Browse our decoration packages or chat with our team to build something custom.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/categories"
              className="rounded-full bg-(--orange-500) px-7 py-3 font-heading text-sm font-semibold text-white hover:bg-(--orange-600)"
            >
              Browse Decorations
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-white/30 px-7 py-3 font-heading text-sm font-semibold text-white hover:border-white/60"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
