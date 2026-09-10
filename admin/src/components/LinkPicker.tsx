import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Link2, Pencil, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// A CTA-link chooser for the admin. The client site's routes are not obvious to
// a non-developer admin, so instead of typing "/category/birthday" by hand they
// can search live categories / products and pick one, or fall back to a custom
// URL for anything the search doesn't cover (external links, one-off routes).

interface LinkOption {
  label: string
  href: string
  hint: string
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
    const t = setTimeout(() => setDebounced(term.trim()), 250)
    return () => clearTimeout(t)
  }, [term])

  const { data: catData, isFetching: catLoading } = useQuery({
    queryKey: ['linkpicker', 'categories', debounced],
    queryFn: () =>
      api.get<SlugRow[]>(`/admin/categories?limit=8${debounced ? `&search=${encodeURIComponent(debounced)}` : ''}`),
    enabled: mode === 'pick',
  })

  const { data: prodData, isFetching: prodLoading } = useQuery({
    queryKey: ['linkpicker', 'products', debounced],
    queryFn: () =>
      api.get<SlugRow[]>(`/admin/products?limit=8${debounced ? `&search=${encodeURIComponent(debounced)}` : ''}`),
    enabled: mode === 'pick',
  })

  const options = useMemo<LinkOption[]>(() => {
    const q = debounced.toLowerCase()
    const pages = q ? STATIC_PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.href.includes(q)) : STATIC_PAGES
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
  }, [catData, prodData, debounced])

  const loading = catLoading || prodLoading

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
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Search className="h-3 w-3" /> Search pages instead
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-md border border-input p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            className="pl-8"
            placeholder="Search categories, products, pages…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3 w-3" /> Custom
        </button>
      </div>

      {value && (
        <div className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium">Selected:</span>
          <code className="truncate">{value}</code>
          <button
            type="button"
            onClick={() => onChange('')}
            className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
          >
            Clear
          </button>
        </div>
      )}

      <div className="max-h-56 overflow-y-auto rounded-md border border-border">
        {loading && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
        {!loading && options.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Nothing found — use <span className="font-medium">Custom</span> for a manual URL.
          </p>
        )}
        {options.map((opt) => {
          const selected = opt.href === value
          return (
            <button
              key={`${opt.hint}:${opt.href}`}
              type="button"
              onClick={() => onChange(opt.href)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary ${
                selected ? 'bg-secondary' : ''
              }`}
            >
              <span className="flex-1 truncate">
                {opt.label}
                <span className="ml-2 text-xs text-muted-foreground">{opt.href}</span>
              </span>
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {opt.hint}
              </span>
              {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
