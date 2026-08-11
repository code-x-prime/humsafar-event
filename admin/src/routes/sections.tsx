import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { ImageDropzone, type UploadedImage } from '@/components/ImageDropzone'
import { Pencil, X, ChevronDown, ChevronRight, GripVertical, LayoutGrid, Image as ImageIcon } from 'lucide-react'

// ── Sections ────────────────────────────────────────────────────────────

interface Section {
  id: string
  name: string
  slug: string
  isActive: boolean
  position: number
  _count?: { products: number }
}

interface SectionProduct {
  id: string
  title: string
  slug: string
  price: string
  isActive: boolean
  media: { url: string }[]
}

interface SectionItem {
  productId: string
  sectionId: string
  position: number
  product: SectionProduct
}

interface SectionDetail extends Section {
  products: SectionItem[]
}

interface ProductOption {
  id: string
  title: string
  isActive: boolean
}

const MAX_PRODUCTS_PER_SECTION = 15

const PRESET_SECTIONS = [
  'Independence Day Decoration',
  'Diwali Decoration',
  'Birthday Decoration',
  'Kids Birthday Decorations',
  'Romantic Anniversary Decoration',
  'Welcome Baby Decoration',
  'Baby Shower Decoration',
  'Bachelorette Party',
  'Car Decoration for Wedding',
  'Shop and Office Decor',
]

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const EMPTY_SECTION_FORM = {
  name: PRESET_SECTIONS[0],
  slug: slugify(PRESET_SECTIONS[0]),
  autoSlug: true,
  isActive: true,
  preset: PRESET_SECTIONS[0] as string,
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function ProductManager({ sectionId }: { sectionId: string }) {
  const queryClient = useQueryClient()
  const [productId, setProductId] = useState('')

  const { data: detailData, isLoading } = useQuery({
    queryKey: ['section', sectionId],
    queryFn: () => api.get<SectionDetail>(`/admin/sections/${sectionId}`),
  })
  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => api.get<ProductOption[]>('/admin/products?limit=200'),
  })

  const section = detailData?.data
  const allProducts = productsData?.data ?? []
  const existingIds = new Set((section?.products ?? []).map((item) => item.productId))
  const availableProducts = allProducts.filter((p) => !existingIds.has(p.id))
  const atLimit = (section?.products.length ?? 0) >= MAX_PRODUCTS_PER_SECTION

  const addMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/sections/${sectionId}/products`, { productId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section', sectionId] })
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      queryClient.invalidateQueries({ queryKey: ['home-feed-order'] })
      setProductId('')
      toast.success('Product added to section')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (pId: string) => api.delete(`/admin/sections/${sectionId}/products/${pId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section', sectionId] })
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      queryClient.invalidateQueries({ queryKey: ['home-feed-order'] })
      toast.success('Product removed from section')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (isLoading) return <Skeleton className="h-24 w-full" />

  return (
    <div className="space-y-3 rounded-md bg-secondary/30 p-3">
      <div className="flex gap-2">
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          disabled={atLimit}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none disabled:opacity-50"
        >
          <option value="">{atLimit ? `Limit reached (${MAX_PRODUCTS_PER_SECTION} max)` : 'Select a product to add...'}</option>
          {availableProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
              {!p.isActive ? ' (inactive)' : ''}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={!productId || atLimit || addMutation.isPending}
          onClick={() => productId && addMutation.mutate(productId)}
        >
          Add
        </Button>
      </div>
      {!atLimit && (
        <p className="text-xs text-muted-foreground">
          {section?.products.length ?? 0} / {MAX_PRODUCTS_PER_SECTION} products
        </p>
      )}

      <ul className="flex flex-col gap-1">
        {(section?.products ?? []).map((item) => (
          <li key={item.productId} className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              {item.product.media[0]?.url && (
                <img src={item.product.media[0].url} alt="" className="h-8 w-8 rounded object-cover" />
              )}
              {item.product.title}
              {!item.product.isActive && <span className="text-xs text-muted-foreground">(inactive)</span>}
            </span>
            <button onClick={() => removeMutation.mutate(item.productId)} aria-label="Remove product">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </li>
        ))}
        {(section?.products ?? []).length === 0 && (
          <li className="text-xs text-muted-foreground">No products in this section yet.</li>
        )}
      </ul>
    </div>
  )
}

// ── Banners ─────────────────────────────────────────────────────────────

interface HomeBanner {
  id: string
  desktopImage: string
  desktopImageR2Key: string | null
  mobileImage: string | null
  mobileImageR2Key: string | null
  heading: string | null
  subtitle: string | null
  buttonText: string | null
  link: string | null
  isActive: boolean
  position: number
}

const EMPTY_BANNER_FORM = {
  desktopImage: null as UploadedImage | null,
  mobileImage: null as UploadedImage | null,
  heading: '',
  subtitle: '',
  buttonText: '',
  link: '',
  isActive: true,
}

type BannerForm = typeof EMPTY_BANNER_FORM

function formFromBanner(b: HomeBanner): BannerForm {
  return {
    desktopImage: { mediaId: '', r2Key: b.desktopImageR2Key || '', url: b.desktopImage },
    mobileImage: b.mobileImage ? { mediaId: '', r2Key: b.mobileImageR2Key || '', url: b.mobileImage } : null,
    heading: b.heading ?? '',
    subtitle: b.subtitle ?? '',
    buttonText: b.buttonText ?? '',
    link: b.link ?? '',
    isActive: b.isActive,
  }
}

function toBannerPayload(form: BannerForm) {
  return {
    desktopImage: form.desktopImage?.url ?? '',
    desktopImageR2Key: form.desktopImage?.r2Key || undefined,
    mobileImage: form.mobileImage?.url || undefined,
    mobileImageR2Key: form.mobileImage?.r2Key || undefined,
    heading: form.heading || undefined,
    subtitle: form.subtitle || undefined,
    buttonText: form.buttonText || undefined,
    link: form.link || undefined,
    isActive: form.isActive,
  }
}

// ── Combined ordering ──────────────────────────────────────────────────

type CombinedRow =
  | { type: 'section'; id: string; position: number; data: Section }
  | { type: 'banner'; id: string; position: number; data: HomeBanner }

function SortableHomeRow({
  row,
  isExpanded,
  onToggleExpand,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  row: CombinedRow
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onToggleActive: (value: boolean) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${row.type}:${row.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background p-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {row.type === 'section' ? (
          <button onClick={onToggleExpand} aria-label="Toggle products" className="text-muted-foreground hover:text-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {row.type === 'section' ? (
          <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-secondary">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </span>
        ) : row.data.desktopImage ? (
          <img src={row.data.desktopImage} alt="" className="h-9 w-14 shrink-0 rounded object-cover" />
        ) : (
          <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-secondary">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </span>
        )}

        <div className="min-w-0 flex-1 basis-32">
          <p className="truncate font-medium">
            {row.type === 'section' ? row.data.name : row.data.heading || '(no heading)'}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.type === 'section' ? `Product section · ${row.data._count?.products ?? 0} product(s)` : 'Banner'}
            {!row.data.isActive && ' · inactive'}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Switch checked={row.data.isActive} onCheckedChange={onToggleActive} />
          <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
            <span className="hidden sm:inline">Delete</span>
            <X className="h-4 w-4 sm:hidden" />
          </Button>
        </div>
      </div>

      {row.type === 'section' && isExpanded && (
        <div className="mt-2 pl-11">
          <ProductManager sectionId={row.id} />
        </div>
      )}
    </div>
  )
}

export function SectionsPage() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<Section | 'new' | null>(null)
  const [sectionForm, setSectionForm] = useState(EMPTY_SECTION_FORM)
  const [editingBanner, setEditingBanner] = useState<HomeBanner | 'new' | null>(null)
  const [bannerForm, setBannerForm] = useState<BannerForm>(EMPTY_BANNER_FORM)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: () => api.get<Section[]>('/admin/sections'),
  })
  const { data: bannersData, isLoading: bannersLoading } = useQuery({
    queryKey: ['home-banners'],
    queryFn: () => api.get<HomeBanner[]>('/admin/home-banners'),
  })

  const isLoading = sectionsLoading || bannersLoading
  const sections = sectionsData?.data ?? []
  const banners = bannersData?.data ?? []

  const rows: CombinedRow[] = [
    ...sections.map((s): CombinedRow => ({ type: 'section', id: s.id, position: s.position, data: s })),
    ...banners.map((b): CombinedRow => ({ type: 'banner', id: b.id, position: b.position, data: b })),
  ].sort((a, b) => a.position - b.position)

  // ── section mutations ──
  function closeSectionForm() {
    setEditingSection(null)
    setSectionForm(EMPTY_SECTION_FORM)
  }
  function openCreateSection() {
    setSectionForm(EMPTY_SECTION_FORM)
    setEditingSection('new')
  }
  function openEditSection(section: Section) {
    setSectionForm({ name: section.name, slug: section.slug, autoSlug: false, isActive: section.isActive, preset: 'Custom' })
    setEditingSection(section)
  }

  const createSectionMutation = useMutation({
    mutationFn: (payload: { name: string; slug: string; isActive: boolean }) => api.post('/admin/sections', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      queryClient.invalidateQueries({ queryKey: ['home-feed-order'] })
      closeSectionForm()
      toast.success('Section created')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; slug: string; isActive: boolean } }) =>
      api.patch(`/admin/sections/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      closeSectionForm()
      toast.success('Section updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const toggleSectionMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      api.patch(`/admin/sections/${id}/toggle`, { field: 'isActive', value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sections'] }),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeSectionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      toast.success('Section deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function handleSectionSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { name: sectionForm.name, slug: sectionForm.autoSlug ? slugify(sectionForm.name) : sectionForm.slug, isActive: sectionForm.isActive }
    if (editingSection === 'new') {
      createSectionMutation.mutate(payload)
    } else if (editingSection) {
      updateSectionMutation.mutate({ id: editingSection.id, payload })
    }
  }

  // ── banner mutations ──
  function closeBannerForm() {
    setEditingBanner(null)
    setBannerForm(EMPTY_BANNER_FORM)
  }
  function openCreateBanner() {
    setBannerForm(EMPTY_BANNER_FORM)
    setEditingBanner('new')
  }
  function openEditBanner(banner: HomeBanner) {
    setBannerForm(formFromBanner(banner))
    setEditingBanner(banner)
  }

  const createBannerMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toBannerPayload>) => api.post('/admin/home-banners', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-banners'] })
      queryClient.invalidateQueries({ queryKey: ['home-feed-order'] })
      closeBannerForm()
      toast.success('Banner created')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateBannerMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof toBannerPayload> }) =>
      api.patch(`/admin/home-banners/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-banners'] })
      closeBannerForm()
      toast.success('Banner updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const toggleBannerMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      api.patch(`/admin/home-banners/${id}/toggle`, { field: 'isActive', value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home-banners'] }),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeBannerMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/home-banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-banners'] })
      toast.success('Banner deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function handleBannerSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = toBannerPayload(bannerForm)
    if (editingBanner === 'new') {
      createBannerMutation.mutate(payload)
    } else if (editingBanner) {
      updateBannerMutation.mutate({ id: editingBanner.id, payload })
    }
  }

  // ── combined reorder ──
  const reorderMutation = useMutation({
    mutationFn: (items: { type: 'section' | 'banner'; id: string; position: number }[]) =>
      api.patch('/admin/sections/home-feed-order', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      queryClient.invalidateQueries({ queryKey: ['home-banners'] })
    },
    onError: (err) => {
      toast.error(errorMessage(err))
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      queryClient.invalidateQueries({ queryKey: ['home-banners'] })
    },
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const idOf = (row: CombinedRow) => `${row.type}:${row.id}`
    const oldIndex = rows.findIndex((r) => idOf(r) === active.id)
    const newIndex = rows.findIndex((r) => idOf(r) === over.id)
    const reordered = arrayMove(rows, oldIndex, newIndex)
    const items = reordered.map((r, index) => ({ type: r.type, id: r.id, position: index }))

    // Optimistic local reorder so the drag feels instant.
    queryClient.setQueryData<{ data: Section[] }>(['sections'], (old) => {
      if (!old) return old
      const positioned = new Map(items.filter((i) => i.type === 'section').map((i) => [i.id, i.position]))
      return { ...old, data: old.data.map((s) => (positioned.has(s.id) ? { ...s, position: positioned.get(s.id)! } : s)) }
    })
    queryClient.setQueryData<{ data: HomeBanner[] }>(['home-banners'], (old) => {
      if (!old) return old
      const positioned = new Map(items.filter((i) => i.type === 'banner').map((i) => [i.id, i.position]))
      return { ...old, data: old.data.map((b) => (positioned.has(b.id) ? { ...b, position: positioned.get(b.id)! } : b)) }
    })

    reorderMutation.mutate(items)
  }

  const isSectionSubmitting = createSectionMutation.isPending || updateSectionMutation.isPending
  const isBannerSubmitting = createBannerMutation.isPending || updateBannerMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Home Page</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything shown on the home page, in order — product-section rows and static promo banners together.
            Drag the grip handle to rearrange (e.g. drop a banner between two sections). Click a section&apos;s arrow
            to manage its products (max {MAX_PRODUCTS_PER_SECTION} per section, the storefront row itself only shows
            the first 5).
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={openCreateBanner}>New Banner</Button>
          <Button onClick={openCreateSection}>New Section</Button>
        </div>
      </div>

      {/* Section create/edit sheet */}
      <Sheet open={editingSection !== null} onOpenChange={(open) => !open && closeSectionForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingSection === 'new' ? 'New Section' : 'Edit Section'}</SheetTitle>
          </SheetHeader>

          <form className="flex flex-col gap-4 px-4" onSubmit={handleSectionSubmit}>
            {editingSection === 'new' && (
              <div className="space-y-1">
                <Label htmlFor="s-preset">Section Type</Label>
                <select
                  id="s-preset"
                  value={sectionForm.preset}
                  onChange={(e) => {
                    const preset = e.target.value
                    const name = preset === 'Custom' ? '' : preset
                    setSectionForm({ ...sectionForm, preset, name, slug: sectionForm.autoSlug ? slugify(name) : sectionForm.slug })
                  }}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none"
                >
                  {PRESET_SECTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="Custom">Custom...</option>
                </select>
              </div>
            )}

            {(editingSection !== 'new' || sectionForm.preset === 'Custom') && (
              <div className="space-y-1">
                <Label htmlFor="s-name">Name</Label>
                <Input
                  id="s-name"
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value, slug: sectionForm.autoSlug ? slugify(e.target.value) : sectionForm.slug })}
                  placeholder="e.g. Diwali Special"
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="s-slug">Slug</Label>
              <Input
                id="s-slug"
                value={sectionForm.slug}
                onChange={(e) => setSectionForm({ ...sectionForm, slug: e.target.value, autoSlug: false })}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="s-active">Active</Label>
              <Switch id="s-active" checked={sectionForm.isActive} onCheckedChange={(v) => setSectionForm({ ...sectionForm, isActive: v })} />
            </div>

            <SheetFooter>
              <Button type="submit" disabled={isSectionSubmitting}>
                {isSectionSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Banner create/edit sheet */}
      <Sheet open={editingBanner !== null} onOpenChange={(open) => !open && closeBannerForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingBanner === 'new' ? 'New Banner' : 'Edit Banner'}</SheetTitle>
          </SheetHeader>

          <form className="flex flex-col gap-4 px-4" onSubmit={handleBannerSubmit}>
            <ImageDropzone
              label="Desktop Image (1920×640)"
              recommendedSize="Recommended: 1920×640px · ratio 3:1"
              value={bannerForm.desktopImage}
              onChange={(image) => setBannerForm({ ...bannerForm, desktopImage: image })}
              folder="home-banners"
            />
            <ImageDropzone
              label="Mobile Image (1080×1080, optional)"
              recommendedSize="Recommended: 1080×1080px · ratio 1:1"
              value={bannerForm.mobileImage}
              onChange={(image) => setBannerForm({ ...bannerForm, mobileImage: image })}
              folder="home-banners"
            />

            <div className="space-y-1">
              <Label htmlFor="b-heading">Heading (optional)</Label>
              <Input
                id="b-heading"
                value={bannerForm.heading}
                onChange={(e) => setBannerForm({ ...bannerForm, heading: e.target.value })}
                placeholder="e.g. Corporate Event Planner"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="b-subtitle">Subtitle (optional)</Label>
              <Input
                id="b-subtitle"
                value={bannerForm.subtitle}
                onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                placeholder="e.g. Get your decoration done in just 2 hours"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="b-button">Button Text (optional)</Label>
                <Input
                  id="b-button"
                  value={bannerForm.buttonText}
                  onChange={(e) => setBannerForm({ ...bannerForm, buttonText: e.target.value })}
                  placeholder="e.g. ORDER NOW"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="b-link">Link (optional)</Label>
                <Input
                  id="b-link"
                  value={bannerForm.link}
                  onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
                  placeholder="/category/corporate-event"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="b-active">Active</Label>
              <Switch id="b-active" checked={bannerForm.isActive} onCheckedChange={(v) => setBannerForm({ ...bannerForm, isActive: v })} />
            </div>

            <SheetFooter>
              <Button type="submit" disabled={isBannerSubmitting || !bannerForm.desktopImage}>
                {isBannerSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <div className="mt-6 flex flex-col gap-2">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}

        {!isLoading && rows.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No sections or banners yet. Create one to start building the home page.
          </p>
        )}

        {!isLoading && rows.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((r) => `${r.type}:${r.id}`)} strategy={verticalListSortingStrategy}>
              {rows.map((row) => (
                <SortableHomeRow
                  key={`${row.type}:${row.id}`}
                  row={row}
                  isExpanded={expandedId === row.id}
                  onToggleExpand={() => setExpandedId(expandedId === row.id ? null : row.id)}
                  onEdit={() => (row.type === 'section' ? openEditSection(row.data) : openEditBanner(row.data))}
                  onToggleActive={(value) =>
                    row.type === 'section'
                      ? toggleSectionMutation.mutate({ id: row.id, value })
                      : toggleBannerMutation.mutate({ id: row.id, value })
                  }
                  onDelete={() =>
                    row.type === 'section' ? removeSectionMutation.mutate(row.id) : removeBannerMutation.mutate(row.id)
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
