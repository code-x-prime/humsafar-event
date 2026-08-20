"use client";

import { useState } from "react";
import Image from "next/image";
import { PartyPopper, Phone, Mail, Clock, MapPin, Send, ChevronDown, Tag, User, Loader2, MessageCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { postJson, ApiError } from "@/lib/api";

const WHATSAPP_NUMBER = "919899899150";
const PHONE_DISPLAY = "+91 98998 99150";
const PHONE_TEL = "+919899899150";
const EMAIL = "humsafarevent010@gmail.com";

const QUICK_CONTACT = [
  {
    icon: null,
    image: "/whatsapp.png",
    label: "WhatsApp",
    sub: "Chat instantly",
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    iconBg: "bg-white",
    iconColor: "",
  },
  {
    icon: Phone,
    image: undefined,
    label: "Call Us",
    sub: PHONE_DISPLAY,
    href: `tel:${PHONE_TEL}`,
    iconBg: "bg-(--coral-100)",
    iconColor: "text-(--coral-600)",
  },
  {
    icon: Mail,
    image: undefined,
    label: "Email",
    sub: "Write to us",
    href: `mailto:${EMAIL}`,
    iconBg: "bg-(--blue-600)/10",
    iconColor: "text-(--blue-600)",
  },
];

const FAQS = [
  {
    q: "How do I book a decoration?",
    a: "Browse our catalog, pick a package, choose your date & time slot, and complete checkout. Our team handles the entire setup at your venue.",
  },
  {
    q: "Which areas do you serve?",
    a: "We currently deliver across Delhi NCR, Chandigarh, and Jaipur. Enter your pincode at checkout to confirm we cover your area.",
  },
  {
    q: "Can I customise a decoration?",
    a: "Yes — most packages support add-ons (cake, flowers, balloon variants) from the product page, and you can leave setup notes at checkout.",
  },
  {
    q: "What is your cancellation policy?",
    a: "You can cancel an unpaid or pending booking anytime before setup begins. For paid bookings, refer to our Refund Policy for the applicable timelines.",
  },
  {
    q: "How can I track my order?",
    a: "Sign in and visit your Profile → Orders to see live status, or use the tracking link sent to your email/WhatsApp after booking.",
  },
];

const EMPTY_FORM = { name: "", phone: "", email: "", subject: "", message: "" };

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-(--ink-100) bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-heading text-sm font-semibold text-(--navy-800)">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-(--ink-500) transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="px-5 pb-4 font-sans text-sm text-(--ink-700)">{a}</p>}
    </div>
  );
}

export function ContactPageContent() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await postJson("/enquiries", {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        eventType: form.subject || undefined,
        message: form.message,
        source: "CONTACT",
      });
      setSubmitted(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-(--surface-warm,#FFF9F2) py-12 sm:py-16">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-(--coral-100) px-3 py-1 font-heading text-xs font-semibold text-(--coral-600)">
              <PartyPopper className="h-3.5 w-3.5" /> We&apos;d love to hear from you
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold text-(--navy-800) sm:text-4xl">Get in Touch</h1>
            <p className="mx-auto mt-3 max-w-xl font-sans text-sm text-(--ink-500) sm:text-base">
              Questions about a booking, a custom theme, or delivery? Our team typically replies within a few hours.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          {/* Quick contact cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {QUICK_CONTACT.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex flex-col items-center gap-2 rounded-2xl border border-(--ink-100) bg-white px-6 py-6 text-center transition-shadow hover:shadow-[0_8px_20px_rgba(11,22,32,0.08)]"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${c.iconBg}`}>
                  {c.image ? (
                    <Image src={c.image} alt={c.label} width={28} height={28} quality={90} className="h-7 w-7" />
                  ) : (
                    c.icon && <c.icon className={`h-5 w-5 ${c.iconColor}`} />
                  )}
                </span>
                <span className="font-heading text-sm font-semibold text-(--navy-800)">{c.label}</span>
                <span className="font-sans text-xs text-(--ink-500)">{c.sub}</span>
              </a>
            ))}
          </div>

          {/* Info + map / message form */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-(--ink-100) bg-white p-5">
                <dl className="flex flex-col divide-y divide-(--ink-100)">
                  <div className="flex items-center gap-3 py-3 first:pt-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--coral-100)">
                      <Phone className="h-4 w-4 text-(--coral-600)" />
                    </span>
                    <div>
                      <dt className="font-heading text-[11px] uppercase tracking-wide text-(--ink-500)">Call Us</dt>
                      <dd className="font-sans text-sm font-medium text-(--navy-800)">{PHONE_DISPLAY}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                      <Image src="/whatsapp.png" alt="WhatsApp" width={20} height={20} quality={90} className="h-5 w-5" />
                    </span>
                    <div>
                      <dt className="font-heading text-[11px] uppercase tracking-wide text-(--ink-500)">WhatsApp</dt>
                      <dd className="font-sans text-sm font-medium text-(--navy-800)">{PHONE_DISPLAY}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--blue-600)/10">
                      <Mail className="h-4 w-4 text-(--blue-600)" />
                    </span>
                    <div>
                      <dt className="font-heading text-[11px] uppercase tracking-wide text-(--ink-500)">Email Us</dt>
                      <dd className="font-sans text-sm font-medium text-(--navy-800)">{EMAIL}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--orange-500)/10">
                      <Clock className="h-4 w-4 text-(--orange-500)" />
                    </span>
                    <div>
                      <dt className="font-heading text-[11px] uppercase tracking-wide text-(--ink-500)">Working Hours</dt>
                      <dd className="font-sans text-sm font-medium text-(--navy-800)">Mon – Sun · 10:00 AM – 7:00 PM</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-3 last:pb-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--coral-100)">
                      <MapPin className="h-4 w-4 text-(--coral-600)" />
                    </span>
                    <div>
                      <dt className="font-heading text-[11px] uppercase tracking-wide text-(--ink-500)">Find Us</dt>
                      <dd className="font-sans text-sm font-medium text-(--navy-800)">Humsafar Events — Delhi NCR, Chandigarh &amp; Jaipur</dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="overflow-hidden rounded-2xl border border-(--ink-100)">
                <iframe
                  title="Humsafar Events location"
                  src="https://www.google.com/maps?q=Delhi%20NCR&output=embed"
                  className="h-64 w-full sm:h-72"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Message form */}
            <div className="rounded-2xl border border-(--ink-100) bg-white p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-(--coral-100)">
                  <MessageCircle className="h-4 w-4 text-(--coral-600)" />
                </span>
                <div>
                  <p className="font-heading text-sm font-semibold text-(--navy-800)">Send us a message</p>
                  <p className="font-sans text-xs text-(--ink-500)">We&apos;ll never share your details.</p>
                </div>
              </div>

              {submitted ? (
                <div className="mt-6 rounded-xl bg-(--success,#15803D)/10 px-4 py-6 text-center">
                  <p className="font-heading text-sm font-semibold text-(--success,#15803D)">Message sent!</p>
                  <p className="mt-1 font-sans text-xs text-(--ink-700)">Thanks for reaching out — our team will get back to you shortly.</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-3 font-heading text-xs font-semibold text-(--blue-600) hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-xl border border-(--ink-300) px-3 py-2.5 focus-within:border-(--blue-600)">
                      <User className="h-4 w-4 shrink-0 text-(--ink-500)" />
                      <input
                        required
                        placeholder="Your name *"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-transparent font-sans text-sm outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-(--ink-300) px-3 py-2.5 focus-within:border-(--blue-600)">
                      <Phone className="h-4 w-4 shrink-0 text-(--ink-500)" />
                      <input
                        required
                        placeholder="Phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full bg-transparent font-sans text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-(--ink-300) px-3 py-2.5 focus-within:border-(--blue-600)">
                    <Mail className="h-4 w-4 shrink-0 text-(--ink-500)" />
                    <input
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-transparent font-sans text-sm outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-(--ink-300) px-3 py-2.5 focus-within:border-(--blue-600)">
                    <Tag className="h-4 w-4 shrink-0 text-(--ink-500)" />
                    <input
                      placeholder="Subject (optional)"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full bg-transparent font-sans text-sm outline-none"
                    />
                  </div>

                  <div className="flex gap-2 rounded-xl border border-(--ink-300) px-3 py-2.5 focus-within:border-(--blue-600)">
                    <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-(--ink-500)" />
                    <textarea
                      required
                      rows={4}
                      placeholder="How can we help? *"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full resize-none bg-transparent font-sans text-sm outline-none"
                    />
                  </div>

                  {error && <p className="font-sans text-xs text-(--coral-600)">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-1 flex items-center justify-center gap-2 rounded-full bg-(--coral-600) px-4 py-3 font-heading text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                  <p className="text-center font-sans text-[11px] text-(--ink-500)">
                    We typically reply within a few hours · Your details are kept private.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-12">
            <div className="text-center">
              <h2 className="font-display text-2xl font-semibold text-(--navy-800)">Frequently Asked Questions</h2>
              <span className="mx-auto mt-1.5 block h-0.75 w-10 rounded-full bg-(--coral-600)" />
              <p className="mt-2 font-sans text-sm text-(--ink-500)">Quick answers to the things people ask us most.</p>
            </div>

            <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-3">
              {FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
