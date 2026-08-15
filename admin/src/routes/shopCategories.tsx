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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from '@/components/ui/sheet'
import { ImageDropzone, type UploadedImage } from '@/components/ImageDropzone'
import { GripVertical, Pencil } from 'lucide-react'

interface ShopCategory {
  id: string
  name: string
  slug: string
  image: string | null
  isActive: boolean
  position: number
  _count?: { products: number }
}

const EMPTY_FORM = {
  name: '',
  image: null as UploadedImage | null,
  isActive: true,
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formFromCategory(category: ShopCategory) {
  return {
    name: category.name,
    image: category.image ? { mediaId: '', r2Key: '', url: category.image } : null,
    isActive: category.isActive,
  }
}

function toPayload(form: typeof EMPTY_FORM) {
  return { name: form.name, image: form.image?.url || undefined, isActive: form.isActive }
}

function SortableRow({
  category,
  onEdit,
  onToggle,
  onDelete,
}: {
  category: ShopCategory
  onEdit: () => void
  onToggle: (value: boolean) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="font-medium">{category.name}</span>
        </div>
      </TableCell>
      <TableCell>{category._count?.products ?? 0}</TableCell>
      <TableCell>
        {category.image ? (
          <img src={category.image} alt="" className="h-10 w-16 rounded object-cover" />
        ) : (
          <span className="text-muted-foreground">No image</span>
        )}
      </TableCell>
      <TableCell>
        <Switch checked={category.isActive} onCheckedChange={onToggle} />
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

export function ShopCategoriesPage() {
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data, isLoading } = useQuery({
    queryKey: ['shop-categories'],
    queryFn: () => api.get<ShopCategory[]>('/admin/shop-categories?limit=100'),
  })

  const categories = [...(data?.data ?? [])].sort((a, b) => a.position - b.position)

  function closeSheet() {
    setSheetOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSheetOpen(true)
  }

  function openEdit(category: ShopCategory) {
    setEditingId(category.id)
    setForm(formFromCategory(category))
    setSheetOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.post('/admin/shop-categories', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] })
      toast.success('Category created')
      closeSheet()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof toPayload> }) =>
      api.patch(`/admin/shop-categories/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] })
      toast.success('Category updated')
      closeSheet()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      api.patch(`/admin/shop-categories/${id}/toggle`, { field: 'isActive', value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop-categories'] }),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/shop-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] })
      toast.success('Category deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; position: number }[]) => api.patch('/admin/shop-categories/reorder', { items }),
    onError: (err) => {
      toast.error(errorMessage(err))
      queryClient.invalidateQueries({ queryKey: ['shop-categories'] })
    },
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex((c) => c.id === active.id)
    const newIndex = categories.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(categories, oldIndex, newIndex)
    const items = reordered.map((c, index) => ({ id: c.id, position: index }))

    queryClient.setQueryData<{ data: ShopCategory[] }>(['shop-categories'], (old) => {
      if (!old) return old
      const positioned = new Map(items.map((i) => [i.id, i.position]))
      return { ...old, data: old.data.map((c) => (positioned.has(c.id) ? { ...c, position: positioned.get(c.id)! } : c)) }
    })

    reorderMutation.mutate(items)
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Shop Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Categories for Shop With Us products. Drag the grip handle to reorder.
          </p>
        </div>

        <Sheet open={sheetOpen} onOpenChange={(open) => (open ? setSheetOpen(true) : closeSheet())}>
          <SheetTrigger render={<Button onClick={openCreate}>Add Category</Button>} />
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingId ? 'Edit Category' : 'Add Category'}</SheetTitle>
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
              <div className="space-y-1">
                <Label htmlFor="sc-name">Name</Label>
                <Input id="sc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>

              <ImageDropzone label="Category Image" value={form.image} onChange={(image) => setForm({ ...form, image })} folder="shop-categories" />

              <div className="flex items-center justify-between">
                <Label htmlFor="sc-active">Active</Label>
                <Switch id="sc-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              </div>

              <SheetFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-6 rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-9 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                </TableRow>
              ))}

            {!isLoading && categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No shop categories yet.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && categories.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {categories.map((category) => (
                    <SortableRow
                      key={category.id}
                      category={category}
                      onEdit={() => openEdit(category)}
                      onToggle={(value) => toggleMutation.mutate({ id: category.id, value })}
                      onDelete={() => removeMutation.mutate(category.id)}
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
