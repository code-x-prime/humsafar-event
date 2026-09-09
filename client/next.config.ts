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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      ...extraImageHosts,
    ],
    // Next.js's default quality (75) visibly softens photos — banners, gallery,
    // and product shots all looked compressed/blurry at that setting. 90 keeps
    // file size reasonable while staying close to source quality.
    qualities: [75, 90],
  },
};

export default nextConfig;
