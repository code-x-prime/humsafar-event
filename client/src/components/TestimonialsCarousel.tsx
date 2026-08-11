"use client";

import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Star } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

export interface Testimonial {
  id: string;
  name: string;
  city: string | null;
  message: string;
  image: string | null;
  rating: string | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = rating >= n;
        const half = !filled && rating >= n - 0.5;
        return (
          <span key={n} className="relative inline-block h-4 w-4">
            <Star className="h-4 w-4 text-(--ink-300)" />
            {(filled || half) && (
              <Star
                className="absolute inset-0 h-4 w-4 fill-(--orange-500) text-(--orange-500)"
                style={half ? { clipPath: "inset(0 50% 0 0)" } : undefined}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

export function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    const rated = testimonials.filter((t) => t.rating);
    if (rated.length === 0) return;
    const avg = rated.reduce((sum, t) => sum + Number(t.rating), 0) / rated.length;
    setAvgRating(avg);
  }, [testimonials]);

  if (testimonials.length === 0) return null;

  return (
    <section className="border-t border-(--ink-100) py-7 sm:py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center gap-2">
          <StarRating rating={avgRating} />
          <span className="font-heading text-sm font-semibold text-(--navy-800)">{avgRating.toFixed(1)}</span>
          <span className="font-sans text-xs text-(--ink-500)">({testimonials.length} reviews)</span>
        </div>
        <h2 className="mt-1 font-display text-xl font-semibold text-(--navy-800) sm:text-2xl">Customer Reviews</h2>
        <span className="mt-1.5 block h-0.75 w-10 rounded-full bg-(--coral-600)" />

        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={[Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })]}
          className="mt-5"
        >
          <CarouselContent>
            {testimonials.map((t) => (
              <CarouselItem key={t.id} className="basis-[85%] sm:basis-1/2 lg:basis-1/3">
                <div className="flex h-full flex-col gap-3 rounded-2xl border border-(--ink-100) bg-white p-5 shadow-[0_1px_2px_rgba(11,22,32,0.06)]">
                  {t.rating && <StarRating rating={Number(t.rating)} />}
                  <p className="line-clamp-4 flex-1 font-sans text-sm text-(--ink-700)">&quot;{t.message}&quot;</p>
                  <div className="flex items-center gap-2.5 border-t border-(--ink-100) pt-3">
                    {t.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.image} alt={t.name} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--coral-100) font-heading text-xs font-semibold text-(--coral-600)">
                        {t.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <p className="font-heading text-sm font-semibold text-(--navy-800)">{t.name}</p>
                      {t.city && <p className="font-sans text-xs text-(--ink-500)">{t.city}</p>}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden border-(--ink-300) text-(--ink-700) hover:border-(--blue-600) hover:text-accent sm:flex" />
          <CarouselNext className="hidden border-(--ink-300) text-(--ink-700) hover:border-(--blue-600) hover:text-accent sm:flex" />
        </Carousel>
      </div>
    </section>
  );
}
