// Data layer for the WordPress blog embedded on the homepage. The blog itself
// lives at humsafarevent.com/blog (separate WordPress install) — this file
// only reads from its public REST API, never writes to it, and never stores a
// copy of the content: WordPress stays the single source of truth.

const WORDPRESS_API_BASE = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || "https://humsafarevent.com/blog/wp-json/wp/v2";

export interface WordPressPost {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url: string;
      alt_text?: string;
      media_details?: {
        sizes?: Record<string, { source_url: string; width: number; height: number }>;
      };
    }>;
    "wp:term"?: Array<
      Array<{
        id: number;
        name: string;
        slug: string;
        taxonomy: string;
      }>
    >;
  };
}

// Everything a <BlogCard> actually needs, already extracted and sanitized —
// the carousel/card components work with this, never with the raw WP shape.
export interface BlogPostSummary {
  id: number;
  title: string;
  excerpt: string;
  link: string;
  date: string;
  imageUrl: string | null;
  imageAlt: string;
  category: string | null;
}

// Strips HTML tags and decodes the handful of entities WordPress titles/
// excerpts commonly contain (&#8217; etc.) without pulling in a DOM parser —
// this runs on the server during the page fetch, where `document` doesn't exist.
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&nbsp;": " ",
  "&#8217;": "’",
  "&#8216;": "‘",
  "&#8220;": "“",
  "&#8221;": "”",
  "&#8211;": "–",
  "&#8212;": "—",
  "&#8230;": "…",
  "&quot;": '"',
  "&#039;": "'",
  "&#39;": "'",
};

export function stripHtml(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, "");
  const decoded = withoutTags.replace(/&[a-zA-Z0-9#]+;/g, (entity) => HTML_ENTITIES[entity] ?? entity);
  return decoded.replace(/\s+/g, " ").trim();
}

// Prefers a WordPress-generated medium size over the original upload — the
// homepage cards never need a multi-MB full-resolution photo.
function pickImageUrl(media: NonNullable<WordPressPost["_embedded"]>["wp:featuredmedia"]): string | null {
  const item = media?.[0];
  if (!item) return null;
  const sizes = item.media_details?.sizes;
  return sizes?.medium_large?.source_url || sizes?.medium?.source_url || sizes?.large?.source_url || item.source_url || null;
}

function toSummary(post: WordPressPost): BlogPostSummary {
  const media = post._embedded?.["wp:featuredmedia"];
  const title = stripHtml(post.title?.rendered || "");
  const categoryTerms = post._embedded?.["wp:term"]?.find((group) => group[0]?.taxonomy === "category");

  return {
    id: post.id,
    title,
    excerpt: stripHtml(post.excerpt?.rendered || ""),
    link: post.link,
    date: post.date,
    imageUrl: pickImageUrl(media),
    imageAlt: media?.[0]?.alt_text || title,
    category: categoryTerms?.[0]?.name || null,
  };
}

// Fetches the latest posts for the homepage's blog section. Never throws —
// the homepage must render even when the WordPress site is down, mid-deploy,
// or briefly unreachable, so any failure just yields an empty list and the
// section hides itself.
export async function getLatestBlogPosts(count = 8): Promise<BlogPostSummary[]> {
  try {
    const res = await fetch(`${WORDPRESS_API_BASE}/posts?_embed&per_page=${count}`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.error(`Failed to fetch WordPress posts: ${res.status} ${res.statusText}`);
      }
      return [];
    }

    const posts: WordPressPost[] = await res.json();
    if (!Array.isArray(posts)) return [];

    return posts.map(toSummary);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to fetch WordPress posts:", error);
    }
    return [];
  }
}
