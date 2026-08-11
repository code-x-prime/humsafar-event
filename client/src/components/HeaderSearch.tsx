"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { getJson } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface SearchCategory {
  id: string;
  name: string;
  slug: string;
}

interface SearchProduct {
  id: string;
  title: string;
  slug: string;
  price: string;
}

interface SearchResults {
  categories: SearchCategory[];
  products: SearchProduct[];
}

const EMPTY_RESULTS: SearchResults = { categories: [], products: [] };

export function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    getJson<SearchResults>(`/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((data) => setResults(data))
      .catch(() => setResults(EMPTY_RESULTS))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults = results.categories.length > 0 || results.products.length > 0;
  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full md:mx-2">
      <div className="flex items-center gap-2 rounded-(--radius-btn,12px) border border-(--ink-300) px-4 py-2.5 focus-within:border-(--blue-600)">
        <Search className="h-4 w-4 shrink-0 text-(--ink-500)" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search decorations..."
          className="w-full bg-transparent font-sans text-sm text-foreground outline-none placeholder:text-(--ink-500)"
        />
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-(--ink-500)" />}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-(--radius-card,16px) border border-(--ink-100) bg-background p-3 shadow-lg">
          {loading && (
            <p className="px-2 py-3 text-sm text-(--ink-500)">Searching...</p>
          )}

          {!loading && !hasResults && (
            <p className="px-2 py-3 text-sm text-(--ink-500)">No results for &quot;{query}&quot;</p>
          )}

          {!loading && results.categories.length > 0 && (
            <div className="mb-2">
              <p className="px-2 font-heading text-xs font-semibold uppercase tracking-wide text-(--ink-500)">
                Categories
              </p>
              {results.categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm hover:bg-(--surface-alt,#F7F9FC) hover:text-accent"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}

          {!loading && results.products.length > 0 && (
            <div>
              <p className="px-2 font-heading text-xs font-semibold uppercase tracking-wide text-(--ink-500)">
                Packages
              </p>
              {results.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/decoration/${product.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-(--surface-alt,#F7F9FC) hover:text-accent"
                >
                  <span>{product.title}</span>
                  <span className="text-(--navy-800)">&#8377;{product.price}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
