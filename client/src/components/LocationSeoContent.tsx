import Link from "next/link";
import {
  CONTACT_NUMBER_DISPLAY,
  CONTACT_NUMBER_WHATSAPP,
  type LocationContent,
  type LocationContentSection,
} from "@/lib/locationContent";
import { whatsappLink } from "@/lib/whatsapp";
import { ChevronDown, Phone } from "lucide-react";

// Long-form SEO copy for a city or category page. Server-rendered on purpose:
// all text (including the FAQ answers, which use native <details>) is in the
// HTML that search engines fetch, with no JavaScript needed to reveal it.

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;
const LINK_CLASS = "font-semibold text-(--orange-600) underline underline-offset-2 hover:opacity-80";

// Renders text with inline [anchor](url) links turned into real links —
// internal paths use <Link>, anything else a plain <a>.
function RichText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(LINK_PATTERN);
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const [, label, href] = match;
    nodes.push(
      href.startsWith("/") ? (
        <Link key={match.index} href={href} className={LINK_CLASS}>
          {label}
        </Link>
      ) : (
        <a key={match.index} href={href} className={LINK_CLASS}>
          {label}
        </a>
      )
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

// Plain text for structured data (links reduced to their anchor text).
function stripLinks(text: string) {
  return text.replace(LINK_PATTERN, "$1");
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text, i) => (
        <p key={i} className="mt-3 font-sans text-sm leading-relaxed text-(--ink-500) sm:text-base">
          <RichText text={text} />
        </p>
      ))}
    </>
  );
}

function WhatsAppButton({ label }: { label: string }) {
  return (
    <a
      href={whatsappLink(CONTACT_NUMBER_WHATSAPP)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block rounded-full bg-[#25D366] px-5 py-2 font-heading text-sm font-semibold text-white hover:bg-[#20bd5a]"
    >
      {label}
    </a>
  );
}

function ContactLine({
  text,
  labels = { whatsapp: "WhatsApp Now", call: "Call Now" },
}: {
  text: string;
  labels?: { whatsapp: string; call: string };
}) {
  return (
    <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-(--ink-100) bg-(--surface-warm,#FFF9F2) p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-heading text-sm font-semibold text-(--navy-800)">{text}</p>
      <div className="flex flex-wrap gap-2">
        <WhatsAppButton label={labels.whatsapp} />
        <a
          href={`tel:${CONTACT_NUMBER_DISPLAY.replace(/[^+\d]/g, "")}`}
          className="flex items-center gap-1.5 rounded-full border border-(--navy-800) px-5 py-2 font-heading text-sm font-semibold text-(--navy-800) hover:bg-(--navy-800) hover:text-white"
        >
          <Phone className="h-3.5 w-3.5" />
          {labels.call}
        </a>
      </div>
    </div>
  );
}

function Section({ section }: { section: LocationContentSection }) {
  return (
    <div className="mt-12">
      {section.eyebrow && (
        <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
          {section.eyebrow}
        </p>
      )}
      <h2 className="mt-1 font-display text-xl font-semibold text-(--navy-800) sm:text-2xl">{section.heading}</h2>

      {section.intro && <Paragraphs items={section.intro} />}

      {section.items && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {section.items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-(--ink-100) bg-white p-5">
              <h3 className="font-display text-base font-semibold text-(--navy-800)">{item.title}</h3>
              {item.body.map((text, i) => (
                <p key={i} className="mt-2 font-sans text-sm leading-relaxed text-(--ink-500)">
                  <RichText text={text} />
                </p>
              ))}
              {item.cta && (
                <div className="mt-4">
                  <WhatsAppButton label={item.cta} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {section.bullets && (
        <ul className="mt-5 flex flex-col gap-3">
          {section.bullets.map((b) => (
            <li
              key={b.label}
              className="rounded-2xl border border-(--ink-100) bg-white p-4 font-sans text-sm leading-relaxed text-(--ink-500)"
            >
              <span className="font-heading font-semibold text-(--navy-800)">{b.label}:</span> {b.text}
            </li>
          ))}
        </ul>
      )}

      {section.outro && <Paragraphs items={section.outro} />}

      {section.cta && <ContactLine text={section.cta} labels={section.ctaLabels} />}

      {section.ctaButton && (
        <div className="mt-5">
          <WhatsAppButton label={section.ctaButton} />
        </div>
      )}
    </div>
  );
}

export function LocationSeoContent({ content }: { content: LocationContent }) {
  // FAQ structured data — lets Google show the questions in search results.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: stripLinks(f.a) },
    })),
  };

  return (
    <section className="border-t border-(--ink-100) bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="font-display text-2xl font-semibold text-(--navy-800) sm:text-3xl">{content.heading}</h2>
        <Paragraphs items={content.intro} />
        <ContactLine text={content.introCta} />

        {content.sections.map((section) => (
          <Section key={section.heading} section={section} />
        ))}

        <div className="mt-12">
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold text-(--navy-800) sm:text-2xl">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-3">
            {content.faqs.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-(--ink-100) bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <h3 className="font-heading text-sm font-semibold text-(--navy-800)">{faq.q}</h3>
                  <ChevronDown className="h-4 w-4 shrink-0 text-(--ink-500) transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-4 font-sans text-sm leading-relaxed text-(--ink-500)">
                  <RichText text={faq.a} />
                </p>
              </details>
            ))}
          </div>
          {content.faqFooter && (
            <p className="mx-auto mt-5 max-w-3xl text-center font-sans text-sm text-(--ink-500)">
              <RichText text={content.faqFooter} />
            </p>
          )}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  );
}
