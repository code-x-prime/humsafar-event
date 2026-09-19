"use client";

import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { BlogCard } from "@/components/BlogCard";
import type { BlogPostSummary } from "@/lib/wordpress";

const WORDPRESS_BLOG_URL = "https://humsafarevent.com/blog/";

// Homepage "Latest Event Ideas & Inspiration" section. Posts are fetched
// server-side (see app/page.tsx -> lib/wordpress.ts) and passed in as props —
// this component only owns the carousel interaction, not the data fetch, so
// the rest of the homepage stays a server component.
export function BlogSection({ posts }: { posts: BlogPostSummary[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="border-t border-(--ink-100) bg-(--surface-alt,#F7F9FB) py-8 sm:py-12" aria-label="Latest blog articles">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
              Our Blog
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-(--navy-800) sm:text-2xl">
              Latest Event Ideas &amp; Inspiration
            </h2>
            <p className="mt-1.5 max-w-xl font-sans text-sm text-(--ink-500)">
              Discover decoration ideas, planning tips and inspiration to make every celebration special.
            </p>
          </div>
          <a
            href={WORDPRESS_BLOG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 font-heading text-sm font-semibold text-accent hover:underline"
          >
            View All Articles →
          </a>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={[Autoplay({ delay: 5500, stopOnInteraction: true, stopOnMouseEnter: true })]}
          className="mt-6 sm:mt-8"
          aria-label="Blog posts carousel"
        >
          <CarouselContent>
            {posts.map((post) => (
              <CarouselItem key={post.id} className="basis-1/2 xl:basis-1/4">
                <BlogCard post={post} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            aria-label="Previous articles"
            className="hidden border-(--ink-300) text-(--ink-700) hover:border-(--blue-600) hover:text-accent sm:flex"
          />
          <CarouselNext
            aria-label="Next articles"
            className="hidden border-(--ink-300) text-(--ink-700) hover:border-(--blue-600) hover:text-accent sm:flex"
          />
        </Carousel>
      </div>
    </section>
  );
}
