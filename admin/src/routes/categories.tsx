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
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { ImageDropzone, type UploadedImage } from '@/components/ImageDropzone'
import { toast } from 'sonner'
import { AlertCircle, GripVertical, Pencil, Plus } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  image: string | null
  isActive: boolean
  showInMenu: boolean
  showOnHome: boolean
  position: number
  _count?: { products: number }
}

type FormMode = { kind: 'create-top' } | { kind: 'create-sub'; parent: Category } | { kind: 'edit'; category: Category }

const EMPTY_FORM = {
  name: '',
  description: '',
  image: null as UploadedImage | null,
  showInMenu: true,
  showOnHome: false,
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formFromCategory(category: Category) {
  return {
    name: category.name,
    description: category.description ?? '',
    image: category.image ? { mediaId: '', r2Key: '', url: category.image } : null,
    showInMenu: category.showInMenu,
    showOnHome: category.showOnHome,
  }
}

function toCategoryPayload(form: typeof EMPTY_FORM, parentId?: string) {
  return {
    name: form.name,
    description: form.description || undefined,
    parentId: parentId || undefined,
    image: form.image?.url,
    imageR2Key: form.image?.r2Key || undefined,
    showInMenu: form.showInMenu,
    showOnHome: form.showOnHome,
  }
}

function SortableRow({
  category,
  isChild,
  onEdit,
  onAddSub,
  onToggle,
  onDelete,
  rowError,
}: {
  category: Category
  isChild: boolean
  onEdit: () => void
  onAddSub?: () => void
  onToggle: (field: 'showInMenu' | 'showOnHome', value: boolean) => void
  onDelete: () => void
  rowError?: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className={isChild ? 'pl-10' : ''}>
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className={isChild ? 'text-muted-foreground' : 'font-medium'}>{category.name}</span>
        </div>
        {rowError && (
          <p className="mt-1 flex items-center gap-1 pl-6 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            {rowError}
          </p>
        )}
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
        <Switch checked={category.showInMenu} onCheckedChange={(value) => onToggle('showInMenu', value)} />
      </TableCell>
      <TableCell>
        <Switch checked={category.showOnHome} onCheckedChange={(value) => onToggle('showOnHome', value)} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {onAddSub && (
            <Button variant="ghost" size="sm" onClick={onAddSub} title="Add subcategory">
              <Plus className="h-4 w-4" />
            </Button>
          )}
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

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const [formMode, setFormMode] = useState<FormMode | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/admin/categories?limit=100'),
  })

  const categories = data?.data ?? []
  const topLevel = [...categories.filter((c) => !c.parentId)].sort((a, b) => a.position - b.position)
  const childrenByParent = categories.reduce<Record<string, Category[]>>((acc, c) => {
    if (c.parentId) {
      acc[c.parentId] = acc[c.parentId] || []
      acc[c.parentId].push(c)
    }
    return acc
  }, {})
  Object.values(childrenByParent).forEach((list) => list.sort((a, b) => a.position - b.position))

  function closeForm() {
    setFormMode(null)
    setForm(EMPTY_FORM)
  }

  function openCreateTop() {
    setForm(EMPTY_FORM)
    setFormMode({ kind: 'create-top' })
  }

  function openCreateSub(parent: Category) {
    setForm(EMPTY_FORM)
    setFormMode({ kind: 'create-sub', parent })
  }

  function openEdit(category: Category) {
    setForm(formFromCategory(category))
    setFormMode({ kind: 'edit', category })
  }

  const createMutation = useMutation({
    mutationFn: (payload: { form: typeof EMPTY_FORM; parentId?: string }) =>
      api.post('/admin/categories', toCategoryPayload(payload.form, payload.parentId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      closeForm()
      toast.success('Category created')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: typeof EMPTY_FORM }) =>
      api.patch(`/admin/categories/${id}`, toCategoryPayload(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      closeForm()
      toast.success('Category updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: boolean }) =>
      api.patch(`/admin/categories/${id}/toggle`, { field, value }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setRowErrors((prev) => ({ ...prev, [variables.id]: '' }))
    },
    onError: (err, variables) => setRowErrors((prev) => ({ ...prev, [variables.id]: errorMessage(err) })),
  })

  const removeMutation = useMutation({
    // Deleting a category also deletes its R2 image server-side (category.service.js).
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; position: number }[]) =>
      api.patch('/admin/categories/reorder', { items }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err) => {
      toast.error(errorMessage(err))
      queryClient.invalidateQueries({ queryKey: ['categories'] }) // revert optimistic order
    },
  })

  function handleDragEnd(list: Category[], event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = list.findIndex((c) => c.id === active.id)
    const newIndex = list.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(list, oldIndex, newIndex)

    const items = reordered.map((c, index) => ({ id: c.id, position: index }))

    // Optimistic local reorder so the drag feels instant.
    queryClient.setQueryData<{ data: Category[] }>(['categories'], (old) => {
      if (!old) return old
      const positioned = new Map(items.map((i) => [i.id, i.position]))
      return { ...old, data: old.data.map((c) => (positioned.has(c.id) ? { ...c, position: positioned.get(c.id)! } : c)) }
    })

    reorderMutation.mutate(items)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formMode) return

    if (formMode.kind === 'edit') {
      updateMutation.mutate({ id: formMode.category.id, form })
    } else if (formMode.kind === 'create-sub') {
      createMutation.mutate({ form, parentId: formMode.parent.id })
    } else {
      createMutation.mutate({ form })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const submitError = formMode?.kind === 'edit' ? updateMutation.error : createMutation.error
  const isFormOpen = formMode !== null

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drives the client site&apos;s category nav. Drag the grip handle to reorder — the order
            here is the order shown on the site. Use the + button on a category to add a
            subcategory under it.
          </p>
        </div>

        <Button onClick={openCreateTop}>Add Category</Button>
      </div>

      <Sheet open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {formMode?.kind === 'edit' && 'Edit Category'}
              {formMode?.kind === 'create-top' && 'Add Category'}
              {formMode?.kind === 'create-sub' && `Add Subcategory`}
            </SheetTitle>
          </SheetHeader>

          {formMode?.kind === 'create-sub' && (
            <p className="px-4 text-sm text-muted-foreground">
              Subcategory of <span className="font-medium text-foreground">{formMode.parent.name}</span>
            </p>
          )}

          <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cat-description">Description</Label>
              <Input
                id="cat-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <ImageDropzone
              label="Category Image"
              value={form.image}
              onChange={(image) => setForm({ ...form, image })}
              folder="categories"
            />

            <div className="flex items-center justify-between">
              <Label htmlFor="cat-show-menu">Show in menu</Label>
              <Switch
                id="cat-show-menu"
                checked={form.showInMenu}
                onCheckedChange={(value) => setForm({ ...form, showInMenu: value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cat-show-home">Show on home page</Label>
              <Switch
                id="cat-show-home"
                checked={form.showOnHome}
                onCheckedChange={(value) => setForm({ ...form, showOnHome: value })}
              />
            </div>

            {submitError ? <p className="text-sm text-destructive">{errorMessage(submitError)}</p> : null}

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
              <TableHead>Name</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>In Menu</TableHead>
              <TableHead>On Home</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-10 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-9 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-9 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-8 w-24" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && topLevel.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No categories yet.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(topLevel, e)}
              >
                <SortableContext items={topLevel.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {topLevel.map((category) => {
                    const children = childrenByParent[category.id] ?? []
                    return (
                      <>
                        <SortableRow
                          key={category.id}
                          category={category}
                          isChild={false}
                          onEdit={() => openEdit(category)}
                          onAddSub={() => openCreateSub(category)}
                          onToggle={(field, value) => toggleMutation.mutate({ id: category.id, field, value })}
                          onDelete={() => removeMutation.mutate(category.id)}
                          rowError={rowErrors[category.id] || undefined}
                        />
                        {children.length > 0 && (
                          <DndContext
                            key={`${category.id}-children`}
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(children, e)}
                          >
                            <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                              {children.map((child) => (
                                <SortableRow
                                  key={child.id}
                                  category={child}
                                  isChild
                                  onEdit={() => openEdit(child)}
                                  onToggle={(field, value) => toggleMutation.mutate({ id: child.id, field, value })}
                                  onDelete={() => removeMutation.mutate(child.id)}
                                  rowError={rowErrors[child.id] || undefined}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        )}
                      </>
                    )
                  })}
                </SortableContext>
              </DndContext>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
