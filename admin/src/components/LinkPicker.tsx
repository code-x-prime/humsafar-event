import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search, Link2, Pencil, Check, Loader2, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'

// A CTA-link chooser for the admin. The client site's routes are not obvious to
// a non-developer admin, so instead of typing "/category/birthday" by hand they
// can search live categories / products and pick one, or fall back to a custom
// URL for anything the search doesn't cover (external links, one-off routes).

const DEBOUNCE_MS = 400
const MIN_CHARS = 2

interface LinkOption {
  label: string
  href: string
  hint: 'Page' | 'Category' | 'Product'
}

// Fixed client routes that aren't in any list API but are common CTA targets.
const STATIC_PAGES: LinkOption[] = [
  { label: 'Home', href: '/', hint: 'Page' },
  { label: 'All Categories', href: '/categories', hint: 'Page' },
  { label: 'Shop With Us', href: '/shop', hint: 'Page' },
  { label: 'Gallery', href: '/gallery', hint: 'Page' },
  { label: 'Reviews', href: '/reviews', hint: 'Page' },
  { label: 'About', href: '/about', hint: 'Page' },
  { label: 'Contact', href: '/contact', hint: 'Page' },
  { label: 'FAQ', href: '/faq', hint: 'Page' },
]

const HINT_STYLES: Record<LinkOption['hint'], string> = {
  Page: 'bg-slate-100 text-slate-600',
  Category: 'bg-amber-100 text-amber-700',
  Product: 'bg-blue-100 text-blue-700',
}

interface SlugRow {
  id: string
  name?: string
  title?: string
  slug: string
}

export function LinkPicker({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (next: string) => void
  id?: string
}) {
  // "custom" once the admin explicitly switches to free-text, or on mount if
  // the saved value doesn't look like one of our pickable routes.
  const looksPickable = /^\/(category|decoration|categories|shop|gallery|reviews|about|contact|faq)?($|\/)/.test(value)
  const [mode, setMode] = useState<'pick' | 'custom'>(value && !looksPickable ? 'custom' : 'pick')

  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [term])

  // Only query the API once the term is meaningful — a single character matches
  // almost everything and fires a request on every keystroke.
  const q = debounced.length >= MIN_CHARS ? debounced : ''
  const canSearch = mode === 'pick' && q.length > 0

  const { data: catData, isFetching: catFetching } = useQuery({
    queryKey: ['linkpicker', 'categories', q],
    queryFn: () => api.get<SlugRow[]>(`/admin/categories?limit=8&search=${encodeURIComponent(q)}`),
    enabled: canSearch,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

  const { data: prodData, isFetching: prodFetching } = useQuery({
    queryKey: ['linkpicker', 'products', q],
    queryFn: () => api.get<SlugRow[]>(`/admin/products?limit=8&search=${encodeURIComponent(q)}`),
    enabled: canSearch,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

  // Results for the term currently shown in the box, not a stale one.
  const results = useMemo<LinkOption[]>(() => {
    if (!q) return []
    const needle = q.toLowerCase()
    const pages = STATIC_PAGES.filter(
      (p) => p.label.toLowerCase().includes(needle) || p.href.includes(needle)
    )
    const cats: LinkOption[] = (catData?.data ?? []).map((c) => ({
      label: c.name ?? c.slug,
      href: `/category/${c.slug}`,
      hint: 'Category',
    }))
    const prods: LinkOption[] = (prodData?.data ?? []).map((p) => ({
      label: p.title ?? p.slug,
      href: `/decoration/${p.slug}`,
      hint: 'Product',
    }))
    return [...pages, ...cats, ...prods]
  }, [catData, prodData, q])

  // "Loading" only when there's nothing to show yet — keepPreviousData means an
  // in-flight refetch still renders the old list, so no flicker between keystrokes.
  const searching = canSearch && (catFetching || prodFetching)
  const showSpinner = searching && results.length === 0

  if (mode === 'custom') {
    return (
      <div className="space-y-1.5">
        <Input
          id={id}
          placeholder="/category/birthday or https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setMode('pick')}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Search className="h-3 w-3" /> Search pages instead
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-input bg-card p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            className="pl-8 pr-8"
            placeholder="Search categories, products, pages…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            autoComplete="off"
          />
          {searching && (
            <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Pencil className="h-3 w-3" /> Custom
        </button>
      </div>

      {value && (
        <div className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="font-medium text-foreground">Selected</span>
          <code className="truncate text-muted-foreground">{value}</code>
          <button
            type="button"
            onClick={() => onChange('')}
            className="ml-auto shrink-0 font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            Clear
          </button>
        </div>
      )}

      {q.length > 0 && (
        <div className="max-h-60 overflow-y-auto rounded-md border border-border">
          {showSpinner && (
            <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </p>
          )}
          {!showSpinner && results.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No matches for “{q}” — use <span className="font-medium text-foreground">Custom</span> for a manual URL.
            </p>
          )}
          {results.map((opt) => {
            const selected = opt.href === value
            return (
              <button
                key={`${opt.hint}:${opt.href}`}
                type="button"
                onClick={() => onChange(opt.href)}
                className={`group flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-secondary ${
                  selected ? 'bg-secondary' : ''
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{opt.href}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${HINT_STYLES[opt.hint]}`}
                >
                  {opt.hint}
                </span>
                {selected ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {q.length === 0 && (
        <p className="px-1 py-1 text-xs text-muted-foreground">
          {term.length > 0 && term.trim().length < MIN_CHARS
            ? `Type at least ${MIN_CHARS} characters…`
            : 'Start typing to search — or hit Custom to paste any URL.'}
        </p>
      )}
    </div>
  )
}
