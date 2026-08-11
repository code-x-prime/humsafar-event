import Link from "next/link";
import { Sparkles, ShieldCheck, Clock, Smile } from "lucide-react";

const USPS = [
  { icon: Sparkles, label: "Custom Themes" },
  { icon: ShieldCheck, label: "Premium Quality" },
  { icon: Clock, label: "On-Time Setup" },
  { icon: Smile, label: "Hassle-Free Service" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-(--surface-warm,#FFF9F2)">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-(--radius-card,16px) bg-(image:--brand-gradient)">
          <div className="relative z-10 grid grid-cols-1 items-center gap-8 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-2">
            <div>
              <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-white/80">
                Together in Every Journey
              </p>
              <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                We Decorate.
                <br />
                You Celebrate.
              </h1>
              <p className="mt-4 max-w-md font-sans text-sm text-white/90 sm:text-base">
                Premium event decoration for birthdays, weddings, baby showers &amp; corporate
                events — trusted setup, on time, every time.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {USPS.map((usp) => (
                  <div key={usp.label} className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                    <usp.icon className="h-4 w-4 text-white" />
                    <span className="font-heading text-xs font-medium text-white">{usp.label}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/category/birthday"
                className="mt-8 inline-block rounded-(--radius-btn,12px) bg-white px-6 py-3 font-heading text-sm font-semibold text-primary hover:bg-white/90"
              >
                Explore Packages
              </Link>
            </div>

            <div className="hidden justify-self-end lg:block" aria-hidden>
              <div className="flex h-64 w-64 items-center justify-center rounded-full border-4 border-white/30">
                <div className="flex h-48 w-48 items-center justify-center rounded-full border-4 border-white/40 text-6xl">
                  🎈
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center font-heading text-sm text-(--ink-500)">
          Now serving <span className="font-semibold text-(--navy-800)">Delhi NCR</span> &middot;{" "}
          <span className="font-semibold text-(--navy-800)">Chandigarh</span> &middot;{" "}
          <span className="font-semibold text-(--navy-800)">Jaipur</span>
        </p>
      </div>
    </section>
  );
}
