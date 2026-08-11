import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { MultiImageDropzone, type UploadedProductImage } from '@/components/MultiImageDropzone'
import { RichTextEditor } from '@/components/RichTextEditor'
import { ArrowLeft, Plus, X, MapPin } from 'lucide-react'

interface Category {
  id: string
  name: string
  parentId: string | null
}

interface City {
  id: string
  name: string
}

interface VariantOption {
  name: string
  swatches: string[]
}

interface VariantPreset {
  id: string
  name: string
  options: VariantOption[]
}

interface AddOnOption {
  id: string
  name: string
  price: string
  category: { id: string; name: string } | null
}

interface SectionOption {
  id: string
  name: string
  isActive: boolean
}

interface Product {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  description: string | null
  inclusions: string[]
  exclusions: string[]
  careInfo: string[]
  deliveryInfo: string | null
  price: string
  mrp: string | null
  isActive: boolean
  isFeatured: boolean
  metaTitle: string | null
  metaDescription: string | null
  categories: { category: Category }[]
  cities: { city: City }[]
  media: { id: string; url: string; r2Key: string }[]
  variants: { id: string; name: string; swatches: string[] }[]
  faqItems: { id: string; question: string; answer: string }[]
  addOns: { addOn: { id: string } }[]
  sections: { section: { id: string } }[]
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  autoSlug: true,
  shortDescription: '',
  description: '',
  price: '',
  mrp: '',
  inclusions: [] as string[],
  exclusions: [] as string[],
  careInfo: [] as string[],
  deliveryInfo: '',
  metaTitle: '',
  metaDescription: '',
  autoMeta: true,
  categoryIds: [] as string[],
  cityIds: [] as string[],
  addOnIds: [] as string[],
  sectionIds: [] as string[],
  media: [] as UploadedProductImage[],
  variants: [] as { name: string; swatches: string }[],
  faqItems: [] as { question: string; answer: string }[],
  isActive: true,
  isFeatured: false,
}

type Form = typeof EMPTY_FORM

// Depth-first tree order so every subcategory renders directly under its
// parent (the flat /admin/categories list comes back ordered by position
// only, which interleaves unrelated top-level categories with each other's
// children and made the checklist confusing to click through).
function sortCategoriesAsTree(categories: Category[]): (Category & { depth: number })[] {
  const byParent = new Map<string | null, Category[]>()
  for (const c of categories) {
    const key = c.parentId
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(c)
  }

  const result: (Category & { depth: number })[] = []
  function walk(parentId: string | null, depth: number) {
    for (const c of byParent.get(parentId) ?? []) {
      result.push({ ...c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return result
}

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formFromProduct(p: Product): Form {
  return {
    title: p.title,
    slug: p.slug,
    autoSlug: false,
    shortDescription: p.shortDescription ?? '',
    description: p.description ?? '',
    price: p.price,
    mrp: p.mrp ?? '',
    inclusions: p.inclusions,
    exclusions: p.exclusions,
    careInfo: p.careInfo,
    deliveryInfo: p.deliveryInfo ?? '',
    metaTitle: p.metaTitle ?? '',
    metaDescription: p.metaDescription ?? '',
    autoMeta: false,
    categoryIds: p.categories.map((c) => c.category.id),
    cityIds: p.cities.map((c) => c.city.id),
    addOnIds: p.addOns.map((a) => a.addOn.id),
    sectionIds: p.sections.map((s) => s.section.id),
    media: p.media.map((m) => ({ mediaId: m.id, r2Key: m.r2Key, url: m.url })),
    variants: p.variants.map((v) => ({ name: v.name, swatches: v.swatches.join(', ') })),
    faqItems: p.faqItems.map((f) => ({ question: f.question, answer: f.answer })),
    isActive: p.isActive,
    isFeatured: p.isFeatured,
  }
}

function toPayload(form: Form) {
  return {
    title: form.title,
    slug: form.autoSlug ? slugify(form.title) : form.slug,
    shortDescription: form.shortDescription || undefined,
    description: form.description || undefined,
    price: Number(form.price),
    mrp: form.mrp ? Number(form.mrp) : undefined,
    inclusions: form.inclusions.filter(Boolean),
    exclusions: form.exclusions.filter(Boolean),
    careInfo: form.careInfo.filter(Boolean),
    deliveryInfo: form.deliveryInfo || undefined,
    metaTitle: form.autoMeta ? form.title : form.metaTitle || undefined,
    metaDescription: form.autoMeta ? form.shortDescription || undefined : form.metaDescription || undefined,
    categoryIds: form.categoryIds,
    cityIds: form.cityIds,
    addOnIds: form.addOnIds,
    sectionIds: form.sectionIds,
    media: form.media.map((m) => ({ r2Key: m.r2Key, url: m.url })),
    variants: form.variants.filter((v) => v.name.trim()).map((v) => ({
      name: v.name.trim(),
      swatches: v.swatches.split(',').map((s) => s.trim()).filter(Boolean),
    })),
    faqItems: form.faqItems.filter((f) => f.question.trim() && f.answer.trim()),
    isActive: form.isActive,
    isFeatured: form.isFeatured,
  }
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  function addItem() {
    const value = draft.trim()
    if (!value) return
    onChange([...items, value])
    setDraft('')
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addItem()
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={addItem}>
          Add
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-center justify-between rounded-md bg-secondary/40 px-2.5 py-1.5 text-sm">
              {item}
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Remove">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 && <p className="text-xs text-muted-foreground">Nothing added yet.</p>}
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  )
}

export function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Form>(EMPTY_FORM)

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get<Product>(`/admin/products/${id}`),
    enabled: isEdit,
  })
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/admin/categories?limit=100'),
  })
  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get<City[]>('/admin/cities?limit=100'),
  })
  const { data: presetsData } = useQuery({
    queryKey: ['variant-presets'],
    queryFn: () => api.get<VariantPreset[]>('/admin/variant-presets'),
  })
  const { data: addOnsData } = useQuery({
    queryKey: ['addons'],
    queryFn: () => api.get<AddOnOption[]>('/admin/addons?limit=100'),
  })
  const { data: sectionsData } = useQuery({
    queryKey: ['sections'],
    queryFn: () => api.get<SectionOption[]>('/admin/sections'),
  })

  useEffect(() => {
    if (productData?.data) setForm(formFromProduct(productData.data))
  }, [productData])

  const categories = categoriesData?.data ?? []
  const categoryTree = sortCategoriesAsTree(categories)
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  // Checking a subcategory implies its whole ancestor chain — a product filed
  // under "Boss Baby Theme" should also count as being under "Baby Shower" and
  // any grandparent, without the admin having to tick each level by hand.
  function toggleCategory(id: string, checked: boolean) {
    if (!checked) {
      setForm((prev) => ({ ...prev, categoryIds: prev.categoryIds.filter((cid) => cid !== id) }))
      return
    }
    const ancestors: string[] = []
    let current: Category | undefined = categoryById.get(id)
    while (current) {
      ancestors.push(current.id)
      current = current.parentId ? categoryById.get(current.parentId) : undefined
    }
    setForm((prev) => ({ ...prev, categoryIds: [...new Set([...prev.categoryIds, ...ancestors])] }))
  }

  const cities = citiesData?.data ?? []
  const presets = presetsData?.data ?? []
  const addOnOptions = addOnsData?.data ?? []
  const sectionOptions = sectionsData?.data ?? []

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.post('/admin/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product created')
      navigate('/products')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.patch(`/admin/products/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      toast.success('Product updated')
      navigate('/products')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = toPayload(form)
    if (isEdit) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  function applyPreset(preset: VariantPreset) {
    setForm({
      ...form,
      variants: preset.options.map((o) => ({ name: o.name, swatches: o.swatches.join(', ') })),
    })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (isEdit && productLoading) {
    return <p className="text-sm text-muted-foreground">Loading product...</p>
  }

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>

      <h1 className="mt-2 font-display text-2xl font-semibold text-primary">
        {isEdit ? 'Edit Product' : 'Add Product'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Full package listing shown on the client site — images, description, pricing, colors,
        what&apos;s included/excluded, FAQs, care &amp; delivery info, categories, and city availability.
      </p>

      <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
        <Section title="Basics">
          <div className="space-y-1">
            <Label htmlFor="p-title">Title</Label>
            <Input id="p-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="p-slug">Slug (URL)</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox checked={form.autoSlug} onCheckedChange={(checked) => setForm({ ...form, autoSlug: checked === true })} />
                Auto-generate from title
              </label>
            </div>
            <Input
              id="p-slug"
              value={form.autoSlug ? slugify(form.title) : form.slug}
              disabled={form.autoSlug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="anniversary-home-decoration"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="p-short">Short Description</Label>
            <Input
              id="p-short"
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              placeholder="One line shown in listings and search results"
            />
          </div>

          <RichTextEditor label="Full Description" value={form.description} onChange={(html) => setForm({ ...form, description: html })} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="p-price">Price (₹)</Label>
              <Input id="p-price" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-mrp">MRP (₹, optional)</Label>
              <Input id="p-mrp" type="number" min="0" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
            </div>
          </div>
        </Section>

        <Section title="Images" description="First image is the cover shown in listings.">
          <MultiImageDropzone label="Product Images" value={form.media} onChange={(media) => setForm({ ...form, media })} folder="products" max={5} />
        </Section>

        <Section title="Choose Colors" description="Pick a saved attribute set, or add one-off colors just for this product.">
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button key={preset.id} type="button" variant="secondary" size="sm" onClick={() => applyPreset(preset)}>
                  Use &quot;{preset.name}&quot;
                </Button>
              ))}
              <Link to="/attributes" className="text-xs text-muted-foreground underline self-center">
                Manage attribute sets
              </Link>
            </div>
          )}
          {presets.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No saved attribute sets yet. <Link to="/attributes" className="underline">Create one</Link> to reuse
              color options across products, or add one-off colors below.
            </p>
          )}

          {form.variants.map((v, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Name, e.g. Gold · White"
                value={v.name}
                onChange={(e) => {
                  const variants = [...form.variants]
                  variants[i] = { ...variants[i], name: e.target.value }
                  setForm({ ...form, variants })
                }}
              />
              <Input
                placeholder="Hex colors, comma separated e.g. #D4AF37, #FFFFFF"
                value={v.swatches}
                onChange={(e) => {
                  const variants = [...form.variants]
                  variants[i] = { ...variants[i], swatches: e.target.value }
                  setForm({ ...form, variants })
                }}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, variants: form.variants.filter((_, idx) => idx !== i) })}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setForm({ ...form, variants: [...form.variants, { name: '', swatches: '' }] })}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add color option
          </Button>
        </Section>

        <Section title="What's Included / Excluded / Care">
          <ListEditor label="What's Included" items={form.inclusions} onChange={(inclusions) => setForm({ ...form, inclusions })} placeholder="e.g. 50 Balloons on Ceiling" />
          <ListEditor label="Not Included" items={form.exclusions} onChange={(exclusions) => setForm({ ...form, exclusions })} placeholder="e.g. No Helium Balloons" />
          <ListEditor label="Care Info" items={form.careInfo} onChange={(careInfo) => setForm({ ...form, careInfo })} placeholder="e.g. Avoid direct sunlight" />
          <div className="space-y-1">
            <Label htmlFor="p-delivery">Delivery Info</Label>
            <Textarea id="p-delivery" rows={3} value={form.deliveryInfo} onChange={(e) => setForm({ ...form, deliveryInfo: e.target.value })} placeholder="e.g. Setup completed 2 hours before your selected slot." />
          </div>
        </Section>

        <Section title="FAQs">
          {form.faqItems.map((f, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border p-3">
              <Input
                placeholder="Question"
                value={f.question}
                onChange={(e) => {
                  const faqItems = [...form.faqItems]
                  faqItems[i] = { ...faqItems[i], question: e.target.value }
                  setForm({ ...form, faqItems })
                }}
              />
              <Textarea
                rows={2}
                placeholder="Answer"
                value={f.answer}
                onChange={(e) => {
                  const faqItems = [...form.faqItems]
                  faqItems[i] = { ...faqItems[i], answer: e.target.value }
                  setForm({ ...form, faqItems })
                }}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, faqItems: form.faqItems.filter((_, idx) => idx !== i) })}>
                Remove FAQ
              </Button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setForm({ ...form, faqItems: [...form.faqItems, { question: '', answer: '' }] })}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ
          </Button>
        </Section>

        <Section title="Categories" description="Select one or more categories/subcategories this product belongs to. Picking a subcategory automatically selects its parent too.">
          <div className="max-h-56 overflow-y-auto rounded-md border border-border p-2">
            {categories.length === 0 && <p className="text-xs text-muted-foreground">No categories yet.</p>}
            {categoryTree.map((c) => (
              <label
                key={c.id}
                style={{ paddingLeft: `${0.5 + c.depth * 1.25}rem` }}
                className={`flex items-center gap-2 rounded py-1.5 pr-2 text-sm hover:bg-secondary/50 ${c.depth === 0 ? 'font-medium' : 'text-muted-foreground'}`}
              >
                <Checkbox
                  checked={form.categoryIds.includes(c.id)}
                  onCheckedChange={(checked) => toggleCategory(c.id, checked === true)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Add-ons" description="Extras the customer can add for this product in the &quot;Customize Your Order&quot; dialog.">
          {addOnOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No add-ons yet. <Link to="/addons" className="underline">Create some</Link> first.
            </p>
          )}
          {addOnOptions.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-md border border-border p-2">
              {addOnOptions.map((a) => (
                <label key={a.id} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary/50">
                  <span className="flex items-center gap-2">
                    <Checkbox
                      checked={form.addOnIds.includes(a.id)}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          addOnIds: checked === true ? [...form.addOnIds, a.id] : form.addOnIds.filter((id) => id !== a.id),
                        })
                      }
                    />
                    {a.name}
                    {a.category && <span className="text-xs text-muted-foreground">({a.category.name})</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">&#8377;{a.price}</span>
                </label>
              ))}
            </div>
          )}
        </Section>

        <Section title="Available in Cities" description="Product only shows to customers browsing a selected city.">
          {cities.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No cities yet. <Link to="/cities" className="underline">Add cities</Link> first.
            </p>
          )}
          {cities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cities.map((c) => {
                const selected = form.cityIds.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        cityIds: selected ? form.cityIds.filter((cid) => cid !== c.id) : [...form.cityIds, c.id],
                      })
                    }
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {c.name}
                  </button>
                )
              })}
            </div>
          )}
          {cities.length > 0 && form.cityIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No city selected — this product won&apos;t be visible to any city until at least one is chosen.
            </p>
          )}
        </Section>

        <Section title="SEO">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={form.autoMeta} onCheckedChange={(checked) => setForm({ ...form, autoMeta: checked === true })} />
            Auto-generate from title/description
          </label>
          <div className="space-y-1">
            <Label htmlFor="p-meta-title" className="text-xs">Meta Title</Label>
            <Input id="p-meta-title" value={form.autoMeta ? form.title : form.metaTitle} disabled={form.autoMeta} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-meta-desc" className="text-xs">Meta Description</Label>
            <Textarea id="p-meta-desc" rows={2} value={form.autoMeta ? form.shortDescription : form.metaDescription} disabled={form.autoMeta} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
          </div>
        </Section>

        <Section title="Visibility">
          <div className="flex items-center justify-between">
            <Label htmlFor="p-active">Active (visible on site)</Label>
            <Switch id="p-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
        </Section>

        <Section title="Home Page Sections" description="Pick which home page rows (Featured, Latest, Best Sellers, or any custom section) this product appears in.">
          {sectionOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No sections yet. <Link to="/sections" className="underline">Create one</Link> first.
            </p>
          )}
          {sectionOptions.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-md border border-border p-2">
              {sectionOptions.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary/50">
                  <Checkbox
                    checked={form.sectionIds.includes(s.id)}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        sectionIds: checked === true ? [...form.sectionIds, s.id] : form.sectionIds.filter((id) => id !== s.id),
                      })
                    }
                  />
                  {s.name}
                  {!s.isActive && <span className="text-xs text-muted-foreground">(inactive)</span>}
                </label>
              ))}
            </div>
          )}
        </Section>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background py-4">
          <Button type="button" variant="ghost" onClick={() => navigate('/products')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}
