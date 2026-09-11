import type { Metadata } from "next";
import Script from "next/script";
import "@fontsource-variable/nunito";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppProviders } from "./providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://humsafarevent.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Event Management Company in Delhi NCR | Humsafar Events",
  description:
    "From private celebrations to corporate events, Humsafar Events handles planning, styling and on-ground execution across Delhi NCR. Discuss your event today.",
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "VFxo9U_JIqdhfDBLf1RVwaN6rR2TXSfwf-WCtdwXYqM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm-init" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KDLPNQP6');
          `}
        </Script>
        {/* End Google Tag Manager */}
      </head>
      <body className="antialiased">
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KDLPNQP6"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}

        {/* Google tag (gtag.js) — shared loader */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-L5VQBX176Z"
          strategy="afterInteractive"
        />
        {/* GA4 — Analytics (SEO) */}
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-L5VQBX176Z');
          `}
        </Script>
        {/* Google Ads — conversions */}
        <Script id="google-ads-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('config', 'AW-18372249208');
          `}
        </Script>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
