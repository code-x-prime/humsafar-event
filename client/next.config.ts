import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // TODO: once R2_PUBLIC_URL is configured in Settings, add its exact hostname
    // here (Next.js requires an explicit allow-list for remote images).
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
};

export default nextConfig;
