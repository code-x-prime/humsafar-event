import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { MultiImageDropzone, type UploadedProductImage } from '@/components/MultiImageDropzone'
import { RichTextEditor } from '@/components/RichTextEditor'
import { ArrowLeft, Plus, X } from 'lucide-react'

interface ShopCategory {
  id: string
  name: string
}

interface ShopProduct {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  description: string | null
  highlights: string[]
  price: string
  mrp: string | null
  sku: string | null
  stock: number
  weightGrams: number | null
  lengthCm: string | null
  breadthCm: string | null
  heightCm: string | null
  shippingInfo: string | null
  isActive: boolean
  isFeatured: boolean
  metaTitle: string | null
  metaDescription: string | null
  categories: { category: ShopCategory }[]
  media: { id: string; url: string; r2Key: string }[]
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  autoSlug: true,
  shortDescription: '',
  description: '',
  highlights: [] as string[],
  price: '',
  mrp: '',
  sku: '',
  stock: '0',
  weightGrams: '',
  lengthCm: '',
  breadthCm: '',
  heightCm: '',
  shippingInfo: '',
  metaTitle: '',
  metaDescription: '',
  autoMeta: true,
  categoryIds: [] as string[],
  media: [] as UploadedProductImage[],
  isActive: true,
  isFeatured: false,
}

type Form = typeof EMPTY_FORM

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formFromProduct(p: ShopProduct): Form {
  return {
    title: p.title,
    slug: p.slug,
    autoSlug: false,
    shortDescription: p.shortDescription ?? '',
    description: p.description ?? '',
    highlights: p.highlights,
    price: p.price,
    mrp: p.mrp ?? '',
    sku: p.sku ?? '',
    stock: String(p.stock),
    weightGrams: p.weightGrams ? String(p.weightGrams) : '',
    lengthCm: p.lengthCm ?? '',
    breadthCm: p.breadthCm ?? '',
    heightCm: p.heightCm ?? '',
    shippingInfo: p.shippingInfo ?? '',
    metaTitle: p.metaTitle ?? '',
    metaDescription: p.metaDescription ?? '',
    autoMeta: false,
    categoryIds: p.categories.map((c) => c.category.id),
    media: p.media.map((m) => ({ mediaId: m.id, r2Key: m.r2Key, url: m.url })),
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
    highlights: form.highlights.filter(Boolean),
    price: Number(form.price),
    mrp: form.mrp ? Number(form.mrp) : undefined,
    sku: form.sku || undefined,
    stock: Number(form.stock) || 0,
    weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
    lengthCm: form.lengthCm ? Number(form.lengthCm) : undefined,
    breadthCm: form.breadthCm ? Number(form.breadthCm) : undefined,
    heightCm: form.heightCm ? Number(form.heightCm) : undefined,
    shippingInfo: form.shippingInfo || undefined,
    metaTitle: form.autoMeta ? form.title : form.metaTitle || undefined,
    metaDescription: form.autoMeta ? form.shortDescription || undefined : form.metaDescription || undefined,
    categoryIds: form.categoryIds,
    media: form.media.map((m) => ({ r2Key: m.r2Key, url: m.url })),
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
          <Plus className="h-4 w-4" />
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

export function ShopProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Form>(EMPTY_FORM)

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['shop-product', id],
    queryFn: () => api.get<ShopProduct>(`/admin/shop-products/${id}`),
    enabled: isEdit,
  })
  const { data: categoriesData } = useQuery({
    queryKey: ['shop-categories'],
    queryFn: () => api.get<ShopCategory[]>('/admin/shop-categories?limit=100'),
  })

  useEffect(() => {
    if (productData?.data) setForm(formFromProduct(productData.data))
  }, [productData])

  const categories = categoriesData?.data ?? []

  function toggleCategory(catId: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      categoryIds: checked ? [...new Set([...prev.categoryIds, catId])] : prev.categoryIds.filter((cid) => cid !== catId),
    }))
  }

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.post('/admin/shop-products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products'] })
      toast.success('Product created')
      navigate('/shop/products')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.patch(`/admin/shop-products/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products'] })
      queryClient.invalidateQueries({ queryKey: ['shop-product', id] })
      toast.success('Product updated')
      navigate('/shop/products')
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

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (isEdit && productLoading) {
    return <p className="text-sm text-muted-foreground">Loading product...</p>
  }

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/shop/products')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>

      <h1 className="mt-2 font-display text-2xl font-semibold text-primary">
        {isEdit ? 'Edit Shop Product' : 'Add Shop Product'}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Physical product sold via Shop With Us — images, description, pricing, stock, and shipping details for Shiprocket.
      </p>

      <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
        <Section title="Basics">
          <div className="space-y-1">
            <Label htmlFor="sp-title">Title</Label>
            <Input id="sp-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="sp-slug">Slug (URL)</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox checked={form.autoSlug} onCheckedChange={(checked) => setForm({ ...form, autoSlug: checked === true })} />
                Auto-generate from title
              </label>
            </div>
            <Input
              id="sp-slug"
              value={form.autoSlug ? slugify(form.title) : form.slug}
              disabled={form.autoSlug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="scented-candle-set"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="sp-short">Short Description</Label>
            <Input
              id="sp-short"
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              placeholder="One line shown in listings and search results"
            />
          </div>

          <RichTextEditor label="Full Description" value={form.description} onChange={(html) => setForm({ ...form, description: html })} />

          <ListEditor
            label="Highlights"
            items={form.highlights}
            onChange={(highlights) => setForm({ ...form, highlights })}
            placeholder="e.g. Handmade in India"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="sp-price">Price (₹)</Label>
              <Input id="sp-price" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sp-mrp">MRP (₹, optional)</Label>
              <Input id="sp-mrp" type="number" min="0" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sp-sku">SKU (optional)</Label>
              <Input id="sp-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="sp-stock">Stock Quantity</Label>
            <Input id="sp-stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          </div>
        </Section>

        <Section title="Images" description="First image is the cover shown in listings.">
          <MultiImageDropzone label="Product Images" value={form.media} onChange={(media) => setForm({ ...form, media })} folder="shop-products" max={8} />
        </Section>

        <Section title="Categories">
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            {categories.length === 0 && <p className="text-xs text-muted-foreground">No shop categories yet.</p>}
            {categories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.categoryIds.includes(cat.id)} onCheckedChange={(checked) => toggleCategory(cat.id, checked === true)} />
                {cat.name}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Shipping" description="Used to calculate Shiprocket rates and generate the shipping label.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="sp-weight">Weight (grams)</Label>
              <Input id="sp-weight" type="number" min="0" value={form.weightGrams} onChange={(e) => setForm({ ...form, weightGrams: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sp-length">Length (cm)</Label>
              <Input id="sp-length" type="number" min="0" value={form.lengthCm} onChange={(e) => setForm({ ...form, lengthCm: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sp-breadth">Breadth (cm)</Label>
              <Input id="sp-breadth" type="number" min="0" value={form.breadthCm} onChange={(e) => setForm({ ...form, breadthCm: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sp-height">Height (cm)</Label>
              <Input id="sp-height" type="number" min="0" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sp-shipping-info">Shipping Info (shown on product page)</Label>
            <Input
              id="sp-shipping-info"
              value={form.shippingInfo}
              onChange={(e) => setForm({ ...form, shippingInfo: e.target.value })}
              placeholder="e.g. Ships in 2-3 business days"
            />
          </div>
        </Section>

        <Section title="SEO">
          <div className="flex items-center justify-between">
            <Label htmlFor="sp-auto-meta">Auto-generate from title &amp; short description</Label>
            <Switch id="sp-auto-meta" checked={form.autoMeta} onCheckedChange={(v) => setForm({ ...form, autoMeta: v })} />
          </div>
          {!form.autoMeta && (
            <>
              <div className="space-y-1">
                <Label htmlFor="sp-meta-title">Meta Title</Label>
                <Input id="sp-meta-title" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sp-meta-description">Meta Description</Label>
                <Input id="sp-meta-description" value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} />
              </div>
            </>
          )}
        </Section>

        <Section title="Visibility">
          <div className="flex items-center justify-between">
            <Label htmlFor="sp-active">Active</Label>
            <Switch id="sp-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sp-featured">Featured</Label>
            <Switch id="sp-featured" checked={form.isFeatured} onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} />
          </div>
        </Section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/shop/products')}>
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
