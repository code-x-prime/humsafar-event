import type { NextConfig } from "next";

// Optional extra image host(s) — set NEXT_PUBLIC_IMAGE_HOST to the R2 custom
// domain that serves media in production (e.g. "cdn.humsafarevent.com").
// Comma-separated for multiple. Next.js requires an explicit allow-list for
// remote images; a host that isn't listed here makes <Image> fail to optimize
// and the picture renders broken or degraded.
const extraImageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOST || "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)
  .map((hostname) => ({ protocol: "https" as const, hostname }));

// Files in /public are served with no cache lifetime by default, so every visit
// re-downloads the banners and logos. Cache them for a month; a replaced image
// should be given a new file name.
const longCache = [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/banner/:path*", headers: longCache },
      { source: "/banners/:path*", headers: longCache },
      { source: "/:file(logo-2.png|logo.jpeg|whatsapp.png)", headers: longCache },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      // WordPress blog media (homepage "Latest Event Ideas & Inspiration" section).
      { protocol: "https", hostname: "humsafarevent.com", pathname: "/blog/**" },
      { protocol: "https", hostname: "www.humsafarevent.com", pathname: "/blog/**" },
      ...extraImageHosts,
    ],
    // Next.js's default quality (75) visibly softens photos — banners, gallery,
    // and product shots all looked compressed/blurry at that setting. 90 keeps
    // file size reasonable while staying close to source quality.
    qualities: [75, 90],
  },
};

export default nextConfig;
