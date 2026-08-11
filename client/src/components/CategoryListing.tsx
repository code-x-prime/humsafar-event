"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Star, TrendingUp, Sparkles, ArrowDownUp, ArrowUpDown, SlidersHorizontal } from "lucide-react";

interface Product {
  id: string;
  title: string;
  slug: string;
  price: string;
  mrp: string | null;
  shortDescription: string | null;
  avgRating: string;
  reviewCount: number;
  media: { url: string }[];
}

interface SubCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

export interface CategoryDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parent: { name: string; slug: string } | null;
  children: SubCategory[];
  products: Product[];
}

const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity", icon: TrendingUp },
  { value: "newest", label: "New Arrivals", icon: Sparkles },
  { value: "price_asc", label: "Low to High", icon: ArrowUpDown },
  { value: "price_desc", label: "High to Low", icon: ArrowDownUp },
];

const PRICE_RANGES = [
  { label: "₹1,000 – ₹6,000", min: "1000", max: "6000" },
  { label: "₹6,000 – ₹11,000", min: "6000", max: "11000" },
  { label: "Above ₹11,000", min: "11000", max: "" },
];

function CategoryTile({ category }: { category: SubCategory }) {
  return (
    <Link href={`/category/${category.slug}`} className="flex w-24 shrink-0 flex-col items-center gap-2 text-center sm:w-28">
      <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-(--ink-100) bg-white sm:h-24 sm:w-24">
        {category.image ? (
          <Image src={category.image} alt={category.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-(--surface-alt,#F7F9FC) font-display text-lg font-semibold text-(--orange-600)">
            {category.name.charAt(0)}
          </div>
        )}
      </div>
      <span className="line-clamp-2 font-heading text-xs font-medium leading-tight text-(--ink-700)">
        {category.name}
      </span>
    </Link>
  );
}

export function CategoryListing({
  category,
  activeSort,
  activeMinPrice,
  activeMaxPrice,
}: {
  category: CategoryDetail;
  activeSort?: string;
  activeMinPrice?: string;
  activeMaxPrice?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sort = activeSort || "popularity";

  function updateQuery(next: { sort?: string; minPrice?: string; maxPrice?: string }) {
    const params = new URLSearchParams();
    const merged = {
      sort: next.sort !== undefined ? next.sort : activeSort,
      minPrice: next.minPrice !== undefined ? next.minPrice : activeMinPrice,
      maxPrice: next.maxPrice !== undefined ? next.maxPrice : activeMaxPrice,
    };
    if (merged.sort && merged.sort !== "popularity") params.set("sort", merged.sort);
    if (merged.minPrice) params.set("minPrice", merged.minPrice);
    if (merged.maxPrice) params.set("maxPrice", merged.maxPrice);

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const isPriceActive = (min: string, max: string) => activeMinPrice === min && (activeMaxPrice || "") === max;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      {category.parent && (
        <p className="font-sans text-xs text-(--ink-500)">
          <Link href="/" className="hover:text-accent">Home</Link> /{" "}
          <Link href={`/category/${category.parent.slug}`} className="hover:text-accent">
            {category.parent.name}
          </Link>{" "}
          / {category.name}
        </p>
      )}

      <h1 className="mt-2 font-display text-2xl font-semibold text-primary sm:text-3xl">{category.name}</h1>
      {category.description && (
        <p className="mt-2 max-w-2xl font-sans text-sm text-(--ink-700)">{category.description}</p>
      )}

      {category.children.length > 0 && (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2 scrollbar-none sm:flex-wrap">
          {category.children.map((child) => (
            <CategoryTile key={child.id} category={child} />
          ))}
        </div>
      )}

      {/* Sort & Filter bar */}
      <div className="mt-7 flex flex-col gap-4 border-y border-(--ink-100) py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none sm:pb-0">
          <span className="hidden shrink-0 items-center gap-1.5 font-heading text-sm font-medium text-(--ink-700) sm:flex">
            <SlidersHorizontal className="h-4 w-4" /> Sort &amp; Filter
          </span>
          {SORT_OPTIONS.map((opt) => {
            const isActive = sort === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => updateQuery({ sort: opt.value })}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-heading text-xs font-medium transition-colors sm:text-sm ${
                  isActive
                    ? "border-(--orange-600) bg-(--orange-50,#FFF4EA) text-(--orange-600)"
                    : "border-(--ink-300) text-(--ink-700) hover:border-(--blue-600)"
                }`}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        <p className="shrink-0 font-sans text-sm text-(--ink-500)">
          {category.products.length} product{category.products.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-sans text-xs text-(--ink-500)">Price</span>
        {PRICE_RANGES.map((range) => {
          const active = isPriceActive(range.min, range.max)
          return (
            <button
              key={range.label}
              onClick={() =>
                updateQuery(
                  active ? { minPrice: "", maxPrice: "" } : { minPrice: range.min, maxPrice: range.max }
                )
              }
              className={`rounded-full border px-3 py-1 font-sans text-xs transition-colors ${
                active
                  ? "border-(--blue-600) bg-(--surface-alt,#F7F9FC) text-accent"
                  : "border-(--ink-300) text-(--ink-700) hover:border-(--blue-600)"
              }`}
            >
              {range.label}
            </button>
          );
        })}
      </div>

      {/* Product grid */}
      <div className="mt-6">
        {category.products.length === 0 ? (
          <div className="rounded-(--radius-card,16px) border border-(--ink-100) bg-white px-6 py-12 text-center">
            <p className="font-sans text-sm text-(--ink-500)">No packages match these filters yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {category.products.map((product) => {
              const discount =
                product.mrp && Number(product.mrp) > Number(product.price)
                  ? Math.round((1 - Number(product.price) / Number(product.mrp)) * 100)
                  : null;

              return (
                <Link
                  key={product.id}
                  href={`/decoration/${product.slug}`}
                  className="group overflow-hidden rounded-2xl border border-(--ink-100) bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-(--surface-alt,#F7F9FC)">
                    {product.media[0] ? (
                      <Image
                        src={product.media[0].url}
                        alt={product.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-sans text-xs text-(--ink-500)">
                        No image
                      </div>
                    )}
                    {discount !== null && (
                      <span className="absolute left-2 top-2 rounded-full bg-(--coral-600) px-2 py-0.5 font-heading text-[10px] font-semibold text-white">
                        {discount}% OFF
                      </span>
                    )}
                  </div>
                  <div className="p-3 sm:p-3.5">
                    <h2 className="line-clamp-2 min-h-9 font-display text-sm font-semibold leading-snug text-(--navy-800)">
                      {product.title}
                    </h2>

                    {product.reviewCount > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-full bg-(--success,#15803D) px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          {product.avgRating}
                        </span>
                        <span className="font-sans text-[11px] text-(--ink-500)">{product.reviewCount} reviews</span>
                      </div>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="font-heading text-sm font-semibold text-(--navy-800) sm:text-base">
                        &#8377;{product.price}
                      </span>
                      {product.mrp && discount !== null && (
                        <span className="font-sans text-xs text-(--ink-500) line-through">&#8377;{product.mrp}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
