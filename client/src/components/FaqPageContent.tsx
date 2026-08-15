"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, ChevronDown, HelpCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const WHATSAPP_NUMBER = "919899899150";

interface FaqEntry {
  category: string;
  q: string;
  a: string;
}

const CATEGORIES = ["All", "Booking", "Delivery & Setup", "Payments", "Customisation", "Cancellation & Refunds", "Account"] as const;

const FAQS: FaqEntry[] = [
  {
    category: "Booking",
    q: "How do I book a decoration?",
    a: "Browse our catalog, pick a package, choose your event date & time slot, and complete checkout. Our team then handles the entire setup at your venue.",
  },
  {
    category: "Booking",
    q: "How far in advance should I book?",
    a: "We recommend booking at least 48 hours before your event to guarantee your preferred slot, though we do accommodate shorter notice depending on availability in your city.",
  },
  {
    category: "Booking",
    q: "Can I book for someone else's event?",
    a: "Yes — just add the venue address and contact details for the event during checkout, even if it's different from your own.",
  },
  {
    category: "Delivery & Setup",
    q: "Which areas do you serve?",
    a: "We currently deliver across Delhi NCR, Chandigarh, and Jaipur. Enter your pincode at checkout to confirm we cover your area.",
  },
  {
    category: "Delivery & Setup",
    q: "How long does setup take?",
    a: "Most packages take 60–90 minutes to set up. The exact setup time is listed on each product page so you know what to expect.",
  },
  {
    category: "Delivery & Setup",
    q: "Do you clean up after the event?",
    a: "Standard packages cover setup only. If you'd like same-day teardown, add it as a note at checkout and our team will confirm availability and pricing.",
  },
  {
    category: "Payments",
    q: "What payment methods do you accept?",
    a: "We accept all major cards, UPI, and net banking through our secure Razorpay checkout. Some packages also support a partial advance payment.",
  },
  {
    category: "Payments",
    q: "Is my payment secure?",
    a: "Yes — all transactions are processed through Razorpay with bank-grade encryption. We never store your card details on our servers.",
  },
  {
    category: "Customisation",
    q: "Can I customise a decoration?",
    a: "Yes — most packages support add-ons (cake, flowers, balloon variants) right from the product page, and you can leave setup notes at checkout.",
  },
  {
    category: "Customisation",
    q: "Can I request a completely custom theme?",
    a: "Absolutely — message us on WhatsApp with your idea, budget, and date, and our team will put together a custom quote for you.",
  },
  {
    category: "Cancellation & Refunds",
    q: "What is your cancellation policy?",
    a: "You can cancel an unpaid or pending booking anytime before setup begins at no charge. For paid bookings, refer to our Refund Policy page for the applicable timelines and deductions.",
  },
  {
    category: "Cancellation & Refunds",
    q: "How long do refunds take?",
    a: "Approved refunds are processed within 5–7 business days and reflect in your original payment method, depending on your bank.",
  },
  {
    category: "Account",
    q: "Do I need an account to book?",
    a: "You can browse and add items to your cart as a guest, but you'll need to sign in with your email to complete checkout and track your order.",
  },
  {
    category: "Account",
    q: "How can I track my order?",
    a: "Sign in and visit your Profile → Orders to see live status, or use the tracking link sent to your email/WhatsApp after booking.",
  },
];

function FaqAccordionItem({ entry }: { entry: FaqEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-(--ink-100) bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-heading text-sm font-semibold text-(--navy-800)">{entry.q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-(--ink-500) transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="px-5 pb-4 font-sans text-sm leading-relaxed text-(--ink-500)">{entry.a}</p>
      )}
    </div>
  );
}

export function FaqPageContent() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const debouncedQuery = useDebouncedValue(query, 250);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return FAQS.filter((f) => {
      const matchesCategory = activeCategory === "All" || f.category === activeCategory;
      const matchesQuery = q.length === 0 || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [debouncedQuery, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, FaqEntry[]>();
    for (const entry of filtered) {
      const list = map.get(entry.category) ?? [];
      list.push(entry);
      map.set(entry.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="border-b border-(--ink-100) bg-(--surface-warm,#FFF9F2) px-4 py-10 text-center sm:py-14">
          <p className="flex items-center justify-center gap-1.5 font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
            <HelpCircle className="h-3.5 w-3.5" />
            Help Center
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-(--navy-800) sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-3 max-w-lg font-sans text-sm text-(--ink-500) sm:text-base">
            Answers to the most common questions about booking, delivery, payments and more.
          </p>

          <div className="mx-auto mt-7 max-w-lg">
            <div className="flex items-center gap-2 rounded-(--radius-btn,12px) border border-(--ink-300) bg-white px-4 py-3 focus-within:border-(--blue-600)">
              <Search className="h-4 w-4 shrink-0 text-(--ink-500)" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a question..."
                className="w-full bg-transparent font-sans text-sm text-foreground outline-none placeholder:text-(--ink-500)"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          {/* Category filter chips */}
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full border px-4 py-1.5 font-heading text-xs font-semibold transition-colors ${
                  activeCategory === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-(--ink-300) text-(--ink-700) hover:border-(--orange-400)"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="mt-8 flex flex-col gap-8">
            {filtered.length === 0 && (
              <p className="rounded-2xl border border-dashed border-(--ink-100) py-12 text-center font-sans text-sm text-(--ink-500)">
                No questions match &quot;{query}&quot; — try a different search or{" "}
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-(--orange-600) hover:underline"
                >
                  ask us on WhatsApp
                </a>
                .
              </p>
            )}

            {[...grouped.entries()].map(([category, entries]) => (
              <div key={category}>
                {activeCategory === "All" && (
                  <p className="mb-3 font-heading text-xs font-semibold uppercase tracking-[.14em] text-(--orange-600)">
                    {category}
                  </p>
                )}
                <div className="flex flex-col gap-3">
                  {entries.map((entry) => (
                    <FaqAccordionItem key={entry.q} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Still need help */}
          <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-(--ink-100) bg-(--surface-alt,#F7F9FC) p-8 text-center">
            <p className="font-heading text-sm font-semibold text-(--navy-800)">Still have a question?</p>
            <p className="font-sans text-sm text-(--ink-500)">Our team typically replies within a few hours.</p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-2.5 font-heading text-sm font-semibold text-white hover:bg-[#20bd5a]"
            >
              <Image src="/whatsapp.png" alt="" width={18} height={18} quality={90} className="h-4.5 w-4.5" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
