"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Star, Search, ArrowDownUp, ArrowUpDown, Sparkles, TrendingUp } from "lucide-react";

export interface ShopProductSummary {
  id: string;
  title: string;
  slug: string;
  price: string;
  mrp: string | null;
  shortDescription: string | null;
  avgRating: string;
  reviewCount: number;
  media: { url: string; alt: string | null; isPrimary: boolean }[];
}

export interface ShopCategorySummary {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  _count: { products: number };
}

const SORT_OPTIONS = [
  { value: "latest", label: "Newest", icon: Sparkles },
  { value: "rating", label: "Top Rated", icon: TrendingUp },
  { value: "price_asc", label: "Low to High", icon: ArrowUpDown },
  { value: "price_desc", label: "High to Low", icon: ArrowDownUp },
];

export function ShopListing({
  products,
  categories,
  activeCategory,
  activeSort,
  activeSearch,
}: {
  products: ShopProductSummary[];
  categories: ShopCategorySummary[];
  activeCategory?: string;
  activeSort?: string;
  activeSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState(activeSearch || "");

  function updateQuery(next: { category?: string; sort?: string; search?: string }) {
    const params = new URLSearchParams();
    const merged = {
      category: next.category !== undefined ? next.category : activeCategory,
      sort: next.sort !== undefined ? next.sort : activeSort,
      search: next.search !== undefined ? next.search : activeSearch,
    };
    if (merged.category) params.set("category", merged.category);
    if (merged.sort) params.set("sort", merged.sort);
    if (merged.search) params.set("search", merged.search);

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateQuery({ search: searchInput.trim() || undefined });
        }}
        className="mx-auto flex max-w-lg items-center gap-2 rounded-full border border-(--ink-300) bg-white px-4 py-2.5"
      >
        <Search className="h-4 w-4 shrink-0 text-(--ink-500)" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search products..."
          className="w-full bg-transparent font-sans text-sm outline-none placeholder:text-(--ink-500)"
        />
      </form>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => updateQuery({ category: undefined })}
            className={`shrink-0 rounded-full border px-4 py-1.5 font-heading text-xs font-semibold transition-colors ${
              !activeCategory
                ? "border-primary bg-primary text-primary-foreground"
                : "border-(--ink-300) text-(--ink-700) hover:border-(--orange-400)"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateQuery({ category: cat.slug })}
              className={`shrink-0 rounded-full border px-4 py-1.5 font-heading text-xs font-semibold transition-colors ${
                activeCategory === cat.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-(--ink-300) text-(--ink-700) hover:border-(--orange-400)"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Sort */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SORT_OPTIONS.map((opt) => {
          const isActive = (activeSort || "latest") === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => updateQuery({ sort: opt.value })}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-heading text-xs font-medium transition-colors ${
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
        <p className="ml-auto shrink-0 font-sans text-sm text-(--ink-500)">
          {products.length} product{products.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Grid */}
      <div className="mt-6">
        {products.length === 0 ? (
          <div className="rounded-(--radius-card,16px) border border-(--ink-100) bg-white px-6 py-12 text-center">
            <p className="font-sans text-sm text-(--ink-500)">No products match right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {products.map((product) => {
              const discount =
                product.mrp && Number(product.mrp) > Number(product.price)
                  ? Math.round((1 - Number(product.price) / Number(product.mrp)) * 100)
                  : null;

              return (
                <Link
                  key={product.id}
                  href={`/shop/${product.slug}`}
                  className="group overflow-hidden rounded-2xl border border-(--ink-100) bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-(--surface-alt,#F7F9FC)">
                    {product.media[0] ? (
                      <Image
                        src={product.media[0].url}
                        alt={product.title}
                        fill
                        quality={90}
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
