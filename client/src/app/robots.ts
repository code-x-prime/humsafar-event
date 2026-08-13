import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://humsafarevent.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/profile", "/login", "/orders"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
