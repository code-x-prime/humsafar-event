"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Star, Search, ArrowDownUp, ArrowUpDown, Sparkles, TrendingUp, SlidersHorizontal, PackageX } from "lucide-react";
import { getJson } from "@/lib/api";

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
  categories: { category: { id: string; name: string; slug: string } }[];
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
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const PRICE_RANGES = [
  { label: "Under ₹500", min: 0, max: 500 },
  { label: "₹500 – ₹1,500", min: 500, max: 1500 },
  { label: "₹1,500 – ₹5,000", min: 1500, max: 5000 },
  { label: "Above ₹5,000", min: 5000, max: Infinity },
];

function ProductCard({ product }: { product: ShopProductSummary }) {
  const discount =
    product.mrp && Number(product.mrp) > Number(product.price)
      ? Math.round((1 - Number(product.price) / Number(product.mrp)) * 100)
      : null;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-(--ink-100) bg-white shadow-[0_1px_2px_rgba(11,22,32,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(11,22,32,0.10)]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-(--surface-alt,#F7F9FC)">
        {product.media[0] ? (
          <Image
            src={product.media[0].url}
            alt={product.title}
            fill
            quality={90}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-sans text-xs text-(--ink-500)">No image</div>
        )}
        {discount !== null && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-(--coral-600) px-2 py-1 font-heading text-[11px] font-bold tracking-wide text-white shadow-sm">
            {discount}% OFF
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h2 className="line-clamp-2 min-h-10 font-display text-sm font-semibold leading-snug text-(--navy-800)">
          {product.title}
        </h2>

        {product.reviewCount > 0 ? (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-(--success,#15803D) px-1.5 py-0.5 text-[11px] font-semibold text-white">
              <Star className="h-2.5 w-2.5 fill-current" />
              {product.avgRating}
            </span>
            <span className="font-sans text-xs text-(--ink-500)">{product.reviewCount} reviews</span>
          </div>
        ) : (
          <div className="h-4.75" />
        )}

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1">
          <span className="font-heading text-base font-bold text-(--navy-800)">&#8377;{product.price}</span>
          {product.mrp && discount !== null && (
            <span className="font-sans text-xs text-(--ink-500) line-through">&#8377;{product.mrp}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-(--ink-100) bg-white">
      <div className="aspect-square w-full animate-pulse bg-(--surface-alt,#F7F9FC)" />
      <div className="flex flex-col gap-2 p-3.5">
        <div className="h-4 w-4/5 animate-pulse rounded bg-(--surface-alt,#F7F9FC)" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-(--surface-alt,#F7F9FC)" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-(--surface-alt,#F7F9FC)" />
      </div>
    </div>
  );
}

export function ShopListing({ categories }: { categories: ShopCategorySummary[] }) {
  const [allProducts, setAllProducts] = useState<ShopProductSummary[] | null>(null);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortValue>("latest");
  const [priceRange, setPriceRange] = useState<(typeof PRICE_RANGES)[number] | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    getJson<ShopProductSummary[]>("/shop/products?limit=100&sort=latest")
      .then(setAllProducts)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination whenever a filter actually changes what's shown.
  useEffect(() => {
    setVisibleCount(24);
  }, [debouncedSearch, category, sort, priceRange]);

  const filtered = useMemo(() => {
    if (!allProducts) return [];
    let items = allProducts;

    if (category) {
      items = items.filter((p) => p.categories.some((c) => c.category.slug === category));
    }

    if (debouncedSearch) {
      items = items.filter((p) => p.title.toLowerCase().includes(debouncedSearch));
    }

    if (priceRange) {
      items = items.filter((p) => Number(p.price) >= priceRange.min && Number(p.price) < priceRange.max);
    }

    const sorted = [...items];
    if (sort === "price_asc") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === "price_desc") sorted.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sort === "rating") sorted.sort((a, b) => Number(b.avgRating) - Number(a.avgRating));

    return sorted;
  }, [allProducts, category, debouncedSearch, priceRange, sort]);

  const visible = filtered.slice(0, visibleCount);
  const loading = allProducts === null && !error;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      {/* Search */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="mx-auto flex max-w-lg items-center gap-2 rounded-full border border-(--ink-300) bg-white px-4 py-2.5"
      >
        <Search className="h-4 w-4 shrink-0 text-(--ink-500)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full bg-transparent font-sans text-sm outline-none placeholder:text-(--ink-500)"
        />
      </form>

      {/* Categories — client-side filter, no navigation */}
      {categories.length > 0 && (
        <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setCategory(null)}
            className={`shrink-0 rounded-full border px-4 py-1.5 font-heading text-xs font-semibold transition-colors ${
              !category
                ? "border-primary bg-primary text-primary-foreground"
                : "border-(--ink-300) text-(--ink-700) hover:border-(--orange-400)"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory((c) => (c === cat.slug ? null : cat.slug))}
              className={`shrink-0 rounded-full border px-4 py-1.5 font-heading text-xs font-semibold transition-colors ${
                category === cat.slug
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
        <span className="hidden shrink-0 items-center gap-1.5 font-heading text-sm font-medium text-(--ink-700) sm:flex">
          <SlidersHorizontal className="h-4 w-4" /> Sort
        </span>
        {SORT_OPTIONS.map((opt) => {
          const isActive = sort === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
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
          {loading ? "Loading..." : `${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {/* Price filter */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-sans text-xs text-(--ink-500)">Price</span>
        {PRICE_RANGES.map((range) => {
          const active = priceRange?.label === range.label;
          return (
            <button
              key={range.label}
              onClick={() => setPriceRange((r) => (r?.label === range.label ? null : range))}
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

      {/* Grid */}
      <div className="mt-6">
        {loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-(--radius-card,16px) border border-(--ink-100) bg-white px-6 py-12 text-center">
            <p className="font-sans text-sm text-(--ink-500)">Couldn&apos;t load products — please refresh.</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-(--radius-card,16px) border border-(--ink-100) bg-white px-6 py-12 text-center">
            <PackageX className="h-8 w-8 text-(--ink-300)" />
            <p className="font-sans text-sm text-(--ink-500)">No products match right now.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {visibleCount < filtered.length && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setVisibleCount((c) => c + 24)}
                  className="rounded-full border border-(--ink-300) px-6 py-2.5 font-heading text-sm font-semibold text-(--ink-700) hover:border-accent hover:text-accent"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
