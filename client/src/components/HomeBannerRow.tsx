import Link from "next/link";

export interface HomeBanner {
  id: string;
  desktopImage: string;
  mobileImage: string | null;
  heading: string | null;
  subtitle: string | null;
  buttonText: string | null;
  link: string | null;
}

export function HomeBannerRow({ banner }: { banner: HomeBanner }) {
  const hasOverlayText = banner.heading || banner.subtitle || banner.buttonText;

  const content = (
    <div className="relative w-full overflow-hidden rounded-2xl">
      {/* Plain <img> (not next/image) — banners are admin-uploaded to arbitrary
          R2/CDN URLs and need a mobile/desktop swap via <picture>, which
          next/image doesn't support directly. */}
      <picture>
        {banner.mobileImage && <source media="(max-width: 640px)" srcSet={banner.mobileImage} />}
        <img src={banner.desktopImage} alt={banner.heading || ""} className="w-full object-cover" />
      </picture>

      {hasOverlayText && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-(--navy-800)/70 via-(--navy-800)/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center gap-2 px-6 sm:px-10">
            {banner.heading && (
              <h3 className="font-display text-xl font-semibold text-white sm:text-2xl">{banner.heading}</h3>
            )}
            {banner.subtitle && <p className="max-w-md font-sans text-sm text-white/85">{banner.subtitle}</p>}
            {banner.buttonText && (
              <span className="mt-2 inline-flex w-fit items-center rounded-full bg-white px-5 py-2 font-heading text-xs font-semibold text-(--navy-800)">
                {banner.buttonText}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <section className="border-t border-(--ink-100) py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4">
        {banner.link ? (
          <Link href={banner.link} className="block">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </section>
  );
}
