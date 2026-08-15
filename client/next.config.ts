import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // TODO: once R2_PUBLIC_URL is configured in Settings, add its exact hostname
    // here (Next.js requires an explicit allow-list for remote images).
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
    // Next.js's default quality (75) visibly softens photos — banners, gallery,
    // and product shots all looked compressed/blurry at that setting. 90 keeps
    // file size reasonable while staying close to source quality.
    qualities: [75, 90],
  },
};

export default nextConfig;
