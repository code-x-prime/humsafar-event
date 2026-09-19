import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { BlogPostSummary } from "@/lib/wordpress";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// A single blog post preview card. Links straight to the real WordPress
// article (post.link) — there is no Next.js blog route, WordPress is the
// canonical URL for every post.
export function BlogCard({ post }: { post: BlogPostSummary }) {
  const formattedDate = formatDate(post.date);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-(--ink-100) bg-white shadow-[0_1px_2px_rgba(11,22,32,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(11,22,32,0.10)]">
      <a href={post.link} target="_blank" rel="noopener noreferrer" className="relative block aspect-[16/10] w-full overflow-hidden bg-(--surface-alt,#F7F9FC)">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt={post.imageAlt}
            fill
            quality={90}
            loading="lazy"
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-sans text-xs text-(--ink-500)">No image</div>
        )}
      </a>

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        {post.category && (
          <span className="w-fit rounded-full bg-(--orange-50,#FFF4E8) px-2.5 py-1 font-heading text-[11px] font-semibold uppercase tracking-wide text-(--orange-600)">
            {post.category}
          </span>
        )}

        {formattedDate && <time dateTime={post.date} className="font-sans text-xs text-(--ink-500)">{formattedDate}</time>}

        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-(--navy-800) sm:text-lg">
          <a href={post.link} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
            {post.title}
          </a>
        </h3>

        {post.excerpt && (
          <p className="line-clamp-2 font-sans text-sm text-(--ink-500) sm:line-clamp-3">{post.excerpt}</p>
        )}

        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center gap-1.5 pt-2 font-heading text-sm font-semibold text-accent transition-transform hover:gap-2.5"
        >
          Read Article
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}
