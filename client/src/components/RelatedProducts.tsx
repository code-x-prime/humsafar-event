"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { getJson } from "@/lib/api";

interface RelatedProduct {
  id: string;
  title: string;
  slug: string;
  price: string;
  mrp: string | null;
  avgRating: string;
  reviewCount: number;
  media: { url: string }[];
}

interface RelatedResponse {
  similar: RelatedProduct[];
  youMayLike: RelatedProduct[];
}

function ProductRow({ title, products }: { title: string; products: RelatedProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-(--navy-800) sm:text-xl">{title}</h2>

      <Carousel opts={{ align: "start", dragFree: true }} className="mt-4">
        <CarouselContent>
          {products.map((product) => {
            const discount =
              product.mrp && Number(product.mrp) > Number(product.price)
                ? Math.round((1 - Number(product.price) / Number(product.mrp)) * 100)
                : null;

            return (
              <CarouselItem key={product.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                <Link
                  href={`/decoration/${product.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-(--ink-100) bg-white shadow-[0_1px_2px_rgba(11,22,32,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-(--ink-100) hover:shadow-[0_12px_24px_rgba(11,22,32,0.10)]"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-(--surface-alt,#F7F9FC)">
                    {product.media[0] ? (
                      <Image
                        src={product.media[0].url}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 208px, 240px"
                        quality={90}
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-sans text-xs text-(--ink-500)">
                        No image
                      </div>
                    )}
                    {discount !== null && (
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-(--coral-600) px-2 py-1 font-heading text-[11px] font-bold tracking-wide text-white shadow-sm">
                        {discount}% OFF
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 p-3.5">
                    <h3 className="line-clamp-2 min-h-10 font-display text-sm font-semibold leading-snug text-(--navy-800)">
                      {product.title}
                    </h3>

                    {product.reviewCount > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-full bg-(--success,#15803D) px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          {product.avgRating}
                        </span>
                        <span className="font-sans text-xs text-(--ink-500)">{product.reviewCount} reviews</span>
                      </div>
                    ) : (
                      <div className="h-[19px]" />
                    )}

                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-heading text-base font-bold text-(--navy-800)">
                        &#8377;{product.price}
                      </span>
                      {product.mrp && discount !== null && (
                        <span className="font-sans text-xs text-(--ink-500) line-through">&#8377;{product.mrp}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden border-(--ink-300) text-(--ink-700) hover:border-(--blue-600) hover:text-accent sm:flex" />
        <CarouselNext className="hidden border-(--ink-300) text-(--ink-700) hover:border-(--blue-600) hover:text-accent sm:flex" />
      </Carousel>
    </section>
  );
}

export function RelatedProducts({ slug }: { slug: string }) {
  const [data, setData] = useState<RelatedResponse | null>(null);

  useEffect(() => {
    getJson<RelatedResponse>(`/products/${slug}/related`)
      .then(setData)
      .catch(() => {
        // Related products unreachable — sections simply don't render.
      });
  }, [slug]);

  if (!data) return null;

  return (
    <>
      <ProductRow title="Similar Packages" products={data.similar} />
      <ProductRow title="You May Also Like" products={data.youMayLike} />
    </>
  );
}
