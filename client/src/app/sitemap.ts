import type { MetadataRoute } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://humsafarevent.com";

interface SlugRow {
  slug: string;
  updatedAt?: string;
}

interface SitemapData {
  products: SlugRow[];
  categories: SlugRow[];
  cities: SlugRow[];
}

async function getSitemapData(): Promise<SitemapData> {
  try {
    const res = await fetch(`${API_BASE}/sitemap-data`, { next: { revalidate: 3600 } });
    if (!res.ok) return { products: [], categories: [], cities: [] };
    const json = await res.json();
    return json.success ? json.data : { products: [], categories: [], cities: [] };
  } catch {
    return { products: [], categories: [], cities: [] };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories, cities } = await getSitemapData();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/categories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/gallery`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/reviews`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/refund-policy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/decoration/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const cityRoutes: MetadataRoute.Sitemap = cities.map((c) => ({
    url: `${SITE_URL}/locations/${c.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...cityRoutes];
}
