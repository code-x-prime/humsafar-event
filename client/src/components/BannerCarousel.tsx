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

// Shown in place of the banner while its own data is still loading, so the
// page never flashes the hardcoded DEFAULT_BANNERS before swapping to the
// real one — same truck animation as the full-page SiteLoader, sized to sit
// inside the banner box instead of covering the whole screen.
function BannerLoader() {
  return (
    <div className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-(--radius-card,16px) bg-(image:--brand-gradient) sm:aspect-3/1">
      <div className="banner-loader">
        <div className="banner-loader__truck-wrapper">
          <div className="banner-loader__truck-body">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 198 93" className="banner-loader__truck-svg">
              <path
                strokeWidth="3"
                stroke="#ffffff"
                fillOpacity="0.9"
                fill="#F83D3D"
                d="M135 22.5H177.264C178.295 22.5 179.22 23.133 179.594 24.0939L192.33 56.8443C192.442 57.1332 192.5 57.4404 192.5 57.7504V89C192.5 90.3807 191.381 91.5 190 91.5H135C133.619 91.5 132.5 90.3807 132.5 89V25C132.5 23.6193 133.619 22.5 135 22.5Z"
              />
              <path
                strokeWidth="3"
                stroke="#ffffff"
                fillOpacity="0.9"
                fill="#7D7C7C"
                d="M146 33.5H181.741C182.779 33.5 183.709 34.1415 184.078 35.112L190.538 52.112C191.16 53.748 189.951 55.5 188.201 55.5H146C144.619 55.5 143.5 54.3807 143.5 53V36C143.5 34.6193 144.619 33.5 146 33.5Z"
              />
              <path
                strokeWidth="2"
                stroke="#ffffff"
                fillOpacity="0.9"
                fill="#282828"
                d="M150 65C150 65.39 149.763 65.8656 149.127 66.2893C148.499 66.7083 147.573 67 146.5 67C145.427 67 144.501 66.7083 143.873 66.2893C143.237 65.8656 143 65.39 143 65C143 64.61 143.237 64.1344 143.873 63.7107C144.501 63.2917 145.427 63 146.5 63C147.573 63 148.499 63.2917 149.127 63.7107C149.763 64.1344 150 64.61 150 65Z"
              />
              <rect strokeWidth="2" stroke="#ffffff" fillOpacity="0.9" fill="#FFFCAB" rx="1" height="7" width="5" y="63" x="187" />
              <rect strokeWidth="2" stroke="#ffffff" fillOpacity="0.9" fill="#282828" rx="1" height="11" width="4" y="81" x="193" />
              <rect strokeWidth="3" stroke="#ffffff" fillOpacity="0.9" fill="#DFDFDF" rx="2.5" height="90" width="121" y="1.5" x="6.5" />
              <rect strokeWidth="2" stroke="#ffffff" fillOpacity="0.9" fill="#DFDFDF" rx="2" height="4" width="6" y="84" x="1" />
            </svg>
          </div>
          <div className="banner-loader__tires">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" className="banner-loader__tire-svg">
              <circle strokeWidth="3" stroke="#ffffff" fillOpacity="0.9" fill="#282828" r="13.5" cy="15" cx="15" />
              <circle fill="#DFDFDF" r="7" cy="15" cx="15" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" className="banner-loader__tire-svg">
              <circle strokeWidth="3" stroke="#ffffff" fillOpacity="0.9" fill="#282828" r="13.5" cy="15" cx="15" />
              <circle fill="#DFDFDF" r="7" cy="15" cx="15" />
            </svg>
          </div>
          <div className="banner-loader__road" />
        </div>
      </div>
      <style jsx>{`
        .banner-loader {
          width: fit-content;
          height: fit-content;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .banner-loader__truck-wrapper {
          width: 160px;
          height: 80px;
          display: flex;
          flex-direction: column;
          position: relative;
          align-items: center;
          justify-content: flex-end;
          overflow-x: hidden;
        }
        .banner-loader__truck-body {
          width: 104px;
          height: fit-content;
          margin-bottom: 5px;
          animation: banner-loader-motion 1s linear infinite;
        }
        @keyframes banner-loader-motion {
          0% { transform: translateY(0px); }
          50% { transform: translateY(2.5px); }
          100% { transform: translateY(0px); }
        }
        .banner-loader__tires {
          width: 104px;
          height: fit-content;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0px 8px 0px 12px;
          position: absolute;
          bottom: 0;
        }
        .banner-loader__tire-svg {
          width: 19px;
        }
        .banner-loader__road {
          width: 100%;
          height: 1.5px;
          background-color: rgba(255, 255, 255, 0.6);
          position: relative;
          bottom: 0;
          align-self: flex-end;
          border-radius: 3px;
          overflow: hidden;
        }
        .banner-loader__road::before {
          content: "";
          position: absolute;
          width: 16px;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.6);
          right: -50%;
          border-radius: 3px;
          animation: banner-loader-road 1.4s linear infinite;
          border-left: 8px solid transparent;
        }
        .banner-loader__road::after {
          content: "";
          position: absolute;
          width: 8px;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.6);
          right: -65%;
          border-radius: 3px;
          animation: banner-loader-road 1.4s linear infinite;
          border-left: 3px solid transparent;
        }
        @keyframes banner-loader-road {
          0% { transform: translateX(0px); }
          100% { transform: translateX(-280px); }
        }
      `}</style>
    </div>
  );
}

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
  const [banners, setBanners] = useState<Banner[] | null>(null);

  useEffect(() => {
    getJson<Banner[]>(`/banners?placement=${placement}`)
      .then((data) => {
        setBanners(data.length > 0 ? data : DEFAULT_BANNERS);
      })
      .catch(() => {
        // API unreachable or errored — fall back to the default banner rather than breaking the homepage.
        setBanners(DEFAULT_BANNERS);
      });
  }, [placement]);

  if (banners === null) {
    return (
      <div className="mx-auto max-w-7xl px-4">
        <BannerLoader />
      </div>
    );
  }

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
