import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from '@/components/ui/sheet'
import { ImageDropzone, type UploadedImage } from '@/components/ImageDropzone'
import { AlertCircle, Pencil } from 'lucide-react'

const PLACEMENTS = ['HOME_HERO', 'HOME_STRIP', 'CATEGORY_TOP', 'OFFER_POPUP'] as const

interface Banner {
  id: string
  title: string | null
  subtitle: string | null
  ctaText: string | null
  ctaLink: string | null
  placement: (typeof PLACEMENTS)[number]
  desktopImageUrl: string | null
  desktopImageR2Key: string | null
  mobileImageUrl: string | null
  mobileImageR2Key: string | null
  position: number
  isActive: boolean
}

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  ctaText: '',
  ctaLink: '',
  desktop: null as UploadedImage | null,
  mobile: null as UploadedImage | null,
  placement: 'HOME_HERO' as (typeof PLACEMENTS)[number],
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function toBannerPayload(form: typeof EMPTY_FORM) {
  return {
    title: form.title,
    subtitle: form.subtitle,
    ctaText: form.ctaText,
    ctaLink: form.ctaLink,
    placement: form.placement,
    desktopImageUrl: form.desktop?.url ?? null,
    desktopImageR2Key: form.desktop?.r2Key || null,
    mobileImageUrl: form.mobile?.url ?? null,
    mobileImageR2Key: form.mobile?.r2Key || null,
  }
}

export function BannersPage() {
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pageError, setPageError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => api.get<Banner[]>('/admin/banners?limit=50'),
  })

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post('/admin/banners', toBannerPayload(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
      setSheetOpen(false)
      setForm(EMPTY_FORM)
      setPageError(null)
    },
    onError: (err) => setPageError(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: typeof form }) =>
      api.patch(`/admin/banners/${id}`, toBannerPayload(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
      setSheetOpen(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      setPageError(null)
    },
    onError: (err) => setPageError(errorMessage(err)),
  })

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSheetOpen(true)
  }

  function openEdit(banner: Banner) {
    setEditingId(banner.id)
    setForm({
      title: banner.title ?? '',
      subtitle: banner.subtitle ?? '',
      ctaText: banner.ctaText ?? '',
      ctaLink: banner.ctaLink ?? '',
      placement: banner.placement,
      desktop: banner.desktopImageUrl
        ? { mediaId: '', r2Key: banner.desktopImageR2Key ?? '', url: banner.desktopImageUrl }
        : null,
      mobile: banner.mobileImageUrl
        ? { mediaId: '', r2Key: banner.mobileImageR2Key ?? '', url: banner.mobileImageUrl }
        : null,
    })
    setSheetOpen(true)
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      api.patch(`/admin/banners/${id}/toggle`, { field: 'isActive', value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
      setPageError(null)
    },
    onError: (err) => setPageError(errorMessage(err)),
  })

  const removeMutation = useMutation({
    // Deleting a banner also deletes its R2 images server-side (banner.service.js).
    mutationFn: (id: string) => api.delete(`/admin/banners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
      setPageError(null)
    },
    onError: (err) => setPageError(errorMessage(err)),
  })

  const banners = data?.data ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Banners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Homepage banner carousel. Desktop 1920×640, Mobile 1080×1080 recommended.
          </p>
        </div>

        <Sheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open)
            if (!open) {
              setEditingId(null)
              setForm(EMPTY_FORM)
            }
          }}
        >
          <SheetTrigger render={<Button onClick={openCreate}>Add Banner</Button>} />
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingId ? 'Edit Banner' : 'Add Banner'}</SheetTitle>
            </SheetHeader>
            <form
              className="flex flex-col gap-4 px-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (editingId) {
                  updateMutation.mutate({ id: editingId, payload: form })
                } else {
                  createMutation.mutate(form)
                }
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="banner-title">Title</Label>
                <Input
                  id="banner-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="banner-subtitle">Subtitle</Label>
                <Input
                  id="banner-subtitle"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="banner-placement">Placement</Label>
                <select
                  id="banner-placement"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.placement}
                  onChange={(e) => setForm({ ...form, placement: e.target.value as typeof form.placement })}
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <ImageDropzone
                label="Desktop Image (1920×640)"
                recommendedSize="Recommended: 1920×640px · ratio 3:1"
                value={form.desktop}
                onChange={(image) => setForm({ ...form, desktop: image })}
                folder="banners/desktop"
              />
              <ImageDropzone
                label="Mobile Image (1080×1080)"
                recommendedSize="Recommended: 1080×1080px · ratio 1:1"
                value={form.mobile}
                onChange={(image) => setForm({ ...form, mobile: image })}
                folder="banners/mobile"
              />

              <div className="space-y-1">
                <Label htmlFor="banner-cta-text">CTA Text</Label>
                <Input
                  id="banner-cta-text"
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="banner-cta-link">CTA Link</Label>
                <Input
                  id="banner-cta-link"
                  placeholder="/category/birthday"
                  value={form.ctaLink}
                  onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                />
              </div>

              {(createMutation.isError || updateMutation.isError) && (
                <p className="text-sm text-destructive">
                  {errorMessage(editingId ? updateMutation.error : createMutation.error)}
                </p>
              )}

              <SheetFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {pageError && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {pageError}
        </div>
      )}

      <div className="mt-6 rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Placement</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Active</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && banners.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No banners yet — the homepage shows a default placeholder until you add one.
                </TableCell>
              </TableRow>
            )}
            {banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell className="font-medium">{banner.title || '—'}</TableCell>
                <TableCell>{banner.placement}</TableCell>
                <TableCell>{banner.position}</TableCell>
                <TableCell>
                  {banner.desktopImageUrl ? (
                    <img src={banner.desktopImageUrl} alt="" className="h-10 w-16 rounded object-cover" />
                  ) : (
                    <span className="text-muted-foreground">No image</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={banner.isActive}
                    onCheckedChange={(value) => toggleMutation.mutate({ id: banner.id, value })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(banner)} aria-label="Edit banner">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(banner.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
