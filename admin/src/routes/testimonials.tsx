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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { ImageDropzone, type UploadedImage } from '@/components/ImageDropzone'
import { Pencil, GripVertical, Star } from 'lucide-react'

interface Testimonial {
  id: string
  name: string
  city: string | null
  message: string
  image: string | null
  imageR2Key: string | null
  rating: string | null
  isActive: boolean
  position: number
}

const EMPTY_FORM = {
  name: '',
  city: '',
  message: '',
  image: null as UploadedImage | null,
  rating: 5,
  isActive: true,
}

type Form = typeof EMPTY_FORM

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formFromTestimonial(t: Testimonial): Form {
  return {
    name: t.name,
    city: t.city ?? '',
    message: t.message,
    image: t.image ? { mediaId: '', r2Key: t.imageR2Key || '', url: t.image } : null,
    rating: t.rating ? Number(t.rating) : 5,
    isActive: t.isActive,
  }
}

function toPayload(form: Form) {
  return {
    name: form.name,
    city: form.city || undefined,
    message: form.message,
    image: form.image?.url || undefined,
    imageR2Key: form.image?.r2Key || undefined,
    rating: form.rating,
    isActive: form.isActive,
  }
}

// Half-star picker: click the left half of a star for X.5, the right half for X.
function StarRatingPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n
        const half = !filled && value >= n - 0.5
        return (
          <span key={n} className="relative inline-block h-6 w-6">
            <Star className="h-6 w-6 text-muted-foreground/30" />
            {(filled || half) && (
              <Star
                className="absolute inset-0 h-6 w-6 fill-amber-400 text-amber-400"
                style={half ? { clipPath: 'inset(0 50% 0 0)' } : undefined}
              />
            )}
            <button
              type="button"
              className="absolute inset-y-0 left-0 w-1/2"
              aria-label={`${n - 0.5} stars`}
              onClick={() => onChange(n - 0.5)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 w-1/2"
              aria-label={`${n} stars`}
              onClick={() => onChange(n)}
            />
          </span>
        )
      })}
      <span className="ml-1.5 text-sm text-muted-foreground">{value.toFixed(1)}</span>
    </div>
  )
}

function SortableTestimonialRow({
  testimonial,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  testimonial: Testimonial
  onEdit: () => void
  onToggleActive: (value: boolean) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: testimonial.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        {testimonial.image ? (
          <img src={testimonial.image} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
            {testimonial.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </TableCell>
      <TableCell className="font-medium">{testimonial.name}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{testimonial.city ?? '—'}</TableCell>
      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{testimonial.message}</TableCell>
      <TableCell className="text-sm">{testimonial.rating ? Number(testimonial.rating).toFixed(1) : '—'}</TableCell>
      <TableCell>
        <Switch checked={testimonial.isActive} onCheckedChange={onToggleActive} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function TestimonialsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Testimonial | 'new' | null>(null)
  const [form, setForm] = useState<Form>(EMPTY_FORM)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data, isLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => api.get<Testimonial[]>('/admin/testimonials?limit=100'),
  })

  const testimonials = [...(data?.data ?? [])].sort((a, b) => a.position - b.position)

  function closeForm() {
    setEditing(null)
    setForm(EMPTY_FORM)
  }
  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing('new')
  }
  function openEdit(t: Testimonial) {
    setForm(formFromTestimonial(t))
    setEditing(t)
  }

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.post('/admin/testimonials', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] })
      closeForm()
      toast.success('Testimonial created')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof toPayload> }) =>
      api.patch(`/admin/testimonials/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] })
      closeForm()
      toast.success('Testimonial updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      api.patch(`/admin/testimonials/${id}/toggle`, { field: 'isActive', value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['testimonials'] }),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/testimonials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] })
      toast.success('Testimonial deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; position: number }[]) => api.patch('/admin/testimonials/reorder', { items }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['testimonials'] }),
    onError: (err) => {
      toast.error(errorMessage(err))
      queryClient.invalidateQueries({ queryKey: ['testimonials'] })
    },
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = testimonials.findIndex((t) => t.id === active.id)
    const newIndex = testimonials.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(testimonials, oldIndex, newIndex)
    const items = reordered.map((t, index) => ({ id: t.id, position: index }))

    queryClient.setQueryData<{ data: Testimonial[] }>(['testimonials'], (old) => {
      if (!old) return old
      const positioned = new Map(items.map((i) => [i.id, i.position]))
      return { ...old, data: old.data.map((t) => (positioned.has(t.id) ? { ...t, position: positioned.get(t.id)! } : t)) }
    })

    reorderMutation.mutate(items)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = toPayload(form)
    if (editing === 'new') {
      createMutation.mutate(payload)
    } else if (editing) {
      updateMutation.mutate({ id: editing.id, payload })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Customer Reviews (Home Carousel)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hand-picked testimonials shown in the scrolling &quot;Customer Reviews&quot; carousel on the home page.
            Drag the grip handle to set the order they scroll in.
          </p>
        </div>
        <Button onClick={openCreate}>New Testimonial</Button>
      </div>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && closeForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing === 'new' ? 'New Testimonial' : 'Edit Testimonial'}</SheetTitle>
          </SheetHeader>

          <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
            <ImageDropzone
              label="Photo (optional — initials shown if empty)"
              value={form.image}
              onChange={(image) => setForm({ ...form, image })}
              folder="testimonials"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="t-name">Name</Label>
                <Input id="t-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="t-city">City (optional)</Label>
                <Input id="t-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Bhopal" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="t-message">Review</Label>
              <Textarea
                id="t-message"
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Rating</Label>
              <StarRatingPicker value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="t-active">Active</Label>
              <Switch id="t-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>

            <SheetFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <div className="mt-6 rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Photo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-9 w-9 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-9 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                </TableRow>
              ))}

            {!isLoading && testimonials.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No testimonials yet.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={testimonials.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {testimonials.map((t) => (
                    <SortableTestimonialRow
                      key={t.id}
                      testimonial={t}
                      onEdit={() => openEdit(t)}
                      onToggleActive={(value) => toggleMutation.mutate({ id: t.id, value })}
                      onDelete={() => removeMutation.mutate(t.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
