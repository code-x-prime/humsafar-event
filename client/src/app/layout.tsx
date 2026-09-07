import type { Metadata } from "next";
import Script from "next/script";
import "@fontsource-variable/nunito";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "Humsafar Events",
  description: "Together in Every Journey — event decoration booking, coming soon.",
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
      <body className="antialiased">
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
