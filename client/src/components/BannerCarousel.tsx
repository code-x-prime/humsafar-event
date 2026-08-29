"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getJson } from "@/lib/api";

interface Banner {
  id: string;
  eyebrow?: string | null;
  title: string | null;
  highlightWord?: string | null;
  subtitle: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  ctaFootnote?: string | null;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
}

// Shown when no active banner exists for this placement yet (e.g. before the
// admin has uploaded anything via Settings/Banners). Replace by adding real
// Banner rows in the admin panel — this fallback disappears automatically
// once the API returns real data.
const DEFAULT_BANNERS: Banner[] = [
  {
    id: "default-1",
    eyebrow: "CELEBRATE BEAUTIFULLY",
    title: "Turn Every Celebration Into a Beautiful Memory.",
    highlightWord: "Beautiful",
    subtitle:
      "Premium decorations, thoughtfully designed for birthdays, weddings, anniversaries & every special moment.",
    ctaText: "Explore Decorations",
    ctaLink: "/category/birthday",
    ctaFootnote: "Curated Designs • Easy Booking • Beautiful Setups",
    desktopImageUrl: "/banner/hero-desktop.jpg",
    mobileImageUrl: "/banner/hero-mobile.jpg",
  },
  {
    id: "default-2",
    eyebrow: "EVERY OCCASION, STYLED",
    title: "Every Celebration, Beautifully Styled.",
    highlightWord: "Beautifully",
    subtitle:
      "From intimate gatherings to grand weddings — decor that makes every moment memorable.",
    ctaText: "Explore Packages",
    ctaLink: "/category/wedding-decoration",
    ctaFootnote: "Curated Designs • Easy Booking • Beautiful Setups",
    desktopImageUrl: "/banners/desktop-2.jpg",
    mobileImageUrl: "/banners/mobile-2.png",
  },
];

// Renders the heading with `highlightWord` (if present in `title`) colored in
// the brand accent instead of white, so a single meaningful word stands out.
function HeadingText({ title, highlightWord }: { title: string; highlightWord?: string | null }) {
  if (!highlightWord) return <>{title}</>;

  const index = title.indexOf(highlightWord);
  if (index === -1) return <>{title}</>;

  return (
    <>
      {title.slice(0, index)}
      <span className="text-(--orange-300)">{highlightWord}</span>
      {title.slice(index + highlightWord.length)}
    </>
  );
}

function BannerSlide({ banner }: { banner: Banner }) {
  const hasImage = banner.desktopImageUrl || banner.mobileImageUrl;
  // Empty-string fields from the admin form are falsy but not null — trim so
  // an all-whitespace/empty value never renders overlay text or a dead button.
  const title = banner.title?.trim() || null;
  const subtitle = banner.subtitle?.trim() || null;
  const ctaText = banner.ctaText?.trim() || null;
  const ctaLink = banner.ctaLink?.trim() || null;

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-(--radius-card,16px) bg-(image:--brand-gradient) sm:aspect-3/1">
      {/* When the banner has no visible text/CTA of its own (a pure image
          banner, e.g. one where the CTA is baked into the artwork itself),
          the whole image becomes the click target for ctaLink so it's not
          just a static picture. */}
      {ctaLink && !title && !subtitle && !ctaText && (
        <Link
          href={ctaLink}
          aria-label="View more"
          onPointerDownCapture={(e) => e.stopPropagation()}
          onMouseDownCapture={(e) => e.stopPropagation()}
          className="absolute inset-0 z-10"
        />
      )}

      {hasImage && (
        // Plain <img> (not next/image) — banners are admin-uploaded to arbitrary
        // R2/CDN URLs, which next/image's remotePatterns allow-list can't
        // anticipate in advance, and a plain <picture> handles the mobile/desktop
        // swap without needing two separately-allowlisted next/image instances.
        <picture>
          {banner.mobileImageUrl && (
            <source media="(max-width: 639px)" srcSet={banner.mobileImageUrl} />
          )}
          <img
            src={banner.desktopImageUrl || banner.mobileImageUrl!}
            alt={title || "Humsafar Events banner"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      )}

      {(title || subtitle || ctaText) && (
        <>
          {/* Dark scrim behind the text so it stays readable over bright/busy
              photos — mobile gets a bottom-up gradient (text sits at the
              bottom), desktop gets a left-to-right one (text sits on the left,
              sm:max-w-[55%] below). */}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/35 to-transparent sm:bg-linear-to-r sm:from-black/65 sm:via-black/30 sm:to-transparent" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col px-5 pb-6 pt-16 sm:inset-0 sm:justify-center sm:px-0 sm:py-0 sm:pl-[9%] sm:pt-0 sm:max-w-[55%]">
            {banner.eyebrow && (
              <p className="font-heading text-[10px] font-semibold uppercase tracking-[.18em] text-white/80 sm:text-xs">
                {banner.eyebrow}
              </p>
            )}

            {title && (
              <h1 className="mt-2 font-display text-xl font-semibold leading-tight text-white sm:mt-3 sm:text-4xl lg:text-5xl">
                <HeadingText title={title} highlightWord={banner.highlightWord} />
              </h1>
            )}

            {subtitle && (
              <p className="mt-2.5 max-w-sm font-sans text-[11px] leading-relaxed text-white/85 sm:mt-4 sm:text-sm">
                {subtitle}
              </p>
            )}

            {ctaText && ctaLink && (
              <Link
                href={ctaLink}
                // Embla's drag/pointer tracking sits on the whole carousel
                // container, and can swallow a click on this link if it reads
                // any pointer movement as a drag — stopping propagation here
                // keeps embla from ever seeing (and cancelling) the click.
                onPointerDownCapture={(e) => e.stopPropagation()}
                onMouseDownCapture={(e) => e.stopPropagation()}
                className="relative z-10 mt-4 inline-block w-fit rounded-(--radius-btn,12px) bg-white px-5 py-2 font-heading text-xs font-semibold text-primary hover:bg-white/90 sm:mt-6 sm:px-6 sm:py-2.5 sm:text-sm"
              >
                {ctaText}
              </Link>
            )}

            {banner.ctaFootnote && (
              <p className="mt-2.5 font-sans text-[10px] text-white/70 sm:mt-3 sm:text-xs">{banner.ctaFootnote}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function BannerCarousel({ placement = "HOME_HERO" }: { placement?: string }) {
  const [banners, setBanners] = useState<Banner[]>(DEFAULT_BANNERS);

  useEffect(() => {
    getJson<Banner[]>(`/banners?placement=${placement}`)
      .then((data) => {
        if (data.length > 0) setBanners(data);
      })
      .catch(() => {
        // API unreachable or errored — keep the default banner, don't break the homepage.
      });
  }, [placement]);

  return (
    <Carousel
      opts={{ loop: true }}
      plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
      className="mx-auto max-w-7xl px-4"
    >
      <CarouselContent>
        {banners.map((banner) => (
          <CarouselItem key={banner.id}>
            <BannerSlide banner={banner} />
          </CarouselItem>
        ))}
      </CarouselContent>
      {banners.length > 1 && (
        <>
          <CarouselPrevious className="left-6" />
          <CarouselNext className="right-6" />
        </>
      )}
    </Carousel>
  );
}
