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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from '@/components/ui/sheet'
import { ImageDropzone, type UploadedImage } from '@/components/ImageDropzone'
import { GripVertical, Pencil, X } from 'lucide-react'

interface GalleryImage {
  id: string
  image: string
  imageR2Key: string | null
  title: string | null
  showOnHome: boolean
  isActive: boolean
  position: number
}

const EMPTY_FORM = {
  image: null as UploadedImage | null,
  title: '',
  showOnHome: false,
  isActive: true,
}

type GalleryForm = typeof EMPTY_FORM

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function toPayload(form: GalleryForm) {
  return {
    image: form.image?.url ?? '',
    imageR2Key: form.image?.r2Key || undefined,
    title: form.title || undefined,
    showOnHome: form.showOnHome,
    isActive: form.isActive,
  }
}

function formFromImage(img: GalleryImage): GalleryForm {
  return {
    image: { mediaId: '', r2Key: img.imageR2Key || '', url: img.image },
    title: img.title ?? '',
    showOnHome: img.showOnHome,
    isActive: img.isActive,
  }
}

function SortableRow({
  image,
  onEdit,
  onToggleActive,
  onToggleHome,
  onDelete,
}: {
  image: GalleryImage
  onEdit: () => void
  onToggleActive: (value: boolean) => void
  onToggleHome: (value: boolean) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background p-3">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <img src={image.image} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />

      <div className="min-w-0 flex-1 basis-32">
        <p className="truncate font-medium">{image.title || '(no title)'}</p>
        <p className="text-xs text-muted-foreground">
          {!image.isActive && 'Inactive'}
          {!image.isActive && image.showOnHome && ' · '}
          {image.showOnHome && 'On home page'}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <Switch checked={image.showOnHome} onCheckedChange={onToggleHome} />
          <span className="text-[10px] text-muted-foreground">Home</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Switch checked={image.isActive} onCheckedChange={onToggleActive} />
          <span className="text-[10px] text-muted-foreground">Active</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
          <span className="hidden sm:inline">Delete</span>
          <X className="h-4 w-4 sm:hidden" />
        </Button>
      </div>
    </div>
  )
}

export function GalleryPage() {
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<GalleryForm>(EMPTY_FORM)
  const [pageError, setPageError] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data, isLoading } = useQuery({
    queryKey: ['gallery'],
    queryFn: () => api.get<GalleryImage[]>('/admin/gallery'),
  })

  const images = [...(data?.data ?? [])].sort((a, b) => a.position - b.position)

  function closeSheet() {
    setSheetOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setPageError(null)
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSheetOpen(true)
  }

  function openEdit(img: GalleryImage) {
    setEditingId(img.id)
    setForm(formFromImage(img))
    setSheetOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.post('/admin/gallery', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      toast.success('Image added to gallery')
      closeSheet()
    },
    onError: (err) => setPageError(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof toPayload> }) =>
      api.patch(`/admin/gallery/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      toast.success('Image updated')
      closeSheet()
    },
    onError: (err) => setPageError(errorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: 'isActive' | 'showOnHome'; value: boolean }) =>
      api.patch(`/admin/gallery/${id}/toggle`, { field, value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gallery'] }),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    // Deleting also deletes the image from R2 server-side (gallery.service.js).
    mutationFn: (id: string) => api.delete(`/admin/gallery/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      toast.success('Image deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; position: number }[]) => api.patch('/admin/gallery/reorder', { items }),
    onError: (err) => {
      toast.error(errorMessage(err))
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
    },
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = images.findIndex((i) => i.id === active.id)
    const newIndex = images.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(images, oldIndex, newIndex)
    const items = reordered.map((img, index) => ({ id: img.id, position: index }))

    queryClient.setQueryData<{ data: GalleryImage[] }>(['gallery'], (old) => {
      if (!old) return old
      const positioned = new Map(items.map((i) => [i.id, i.position]))
      return { ...old, data: old.data.map((img) => (positioned.has(img.id) ? { ...img, position: positioned.get(img.id)! } : img)) }
    })

    reorderMutation.mutate(items)
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Photos shown on the public /gallery page. Drag the grip handle to reorder. "Home" is off by
            default — turn it on for a photo you also want to appear on the home page.
          </p>
        </div>

        <Sheet open={sheetOpen} onOpenChange={(open) => (open ? setSheetOpen(true) : closeSheet())}>
          <SheetTrigger render={<Button onClick={openCreate}>Add Image</Button>} />
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingId ? 'Edit Image' : 'Add Image'}</SheetTitle>
            </SheetHeader>

            <form
              className="flex flex-col gap-4 px-4"
              onSubmit={(e) => {
                e.preventDefault()
                const payload = toPayload(form)
                if (editingId) {
                  updateMutation.mutate({ id: editingId, payload })
                } else {
                  createMutation.mutate(payload)
                }
              }}
            >
              <ImageDropzone
                label="Image"
                recommendedSize="Any size — square or portrait photos work best in the grid"
                value={form.image}
                onChange={(image) => setForm({ ...form, image })}
                folder="gallery"
              />

              <div className="space-y-1">
                <Label htmlFor="g-title">Title (optional)</Label>
                <Input
                  id="g-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Birthday Balloon Setup"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="g-home">Show on home page</Label>
                <Switch id="g-home" checked={form.showOnHome} onCheckedChange={(v) => setForm({ ...form, showOnHome: v })} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="g-active">Active</Label>
                <Switch id="g-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              </div>

              {pageError && <p className="text-sm text-destructive">{pageError}</p>}

              <SheetFooter>
                <Button type="submit" disabled={isSubmitting || !form.image}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}

        {!isLoading && images.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No gallery images yet. Add one to start building the gallery page.
          </p>
        )}

        {!isLoading && images.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={images.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {images.map((img) => (
                <SortableRow
                  key={img.id}
                  image={img}
                  onEdit={() => openEdit(img)}
                  onToggleActive={(value) => toggleMutation.mutate({ id: img.id, field: 'isActive', value })}
                  onToggleHome={(value) => toggleMutation.mutate({ id: img.id, field: 'showOnHome', value })}
                  onDelete={() => removeMutation.mutate(img.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
