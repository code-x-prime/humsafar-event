import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://humsafarevent.com";

// AI crawler bots (OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, Claude-User,
// PerplexityBot, Perplexity-User) are explicitly allowed per the SEO team's
// request, alongside the default "*" rule for every other crawler.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cgi-bin/", "/cart", "/profile", "/login", "/orders"],
      },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-User", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Perplexity-User", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
