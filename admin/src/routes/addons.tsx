import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { ImageDropzone, type UploadedImage } from '@/components/ImageDropzone'
import { Pencil, X } from 'lucide-react'

interface AddOnCategory {
  id: string
  name: string
  position: number
  _count?: { addOns: number }
}

interface AddOn {
  id: string
  name: string
  price: string
  image: string | null
  imageR2Key: string | null
  categoryId: string | null
  isActive: boolean
  category: AddOnCategory | null
  _count?: { products: number }
}

const EMPTY_FORM = {
  name: '',
  price: '',
  categoryId: '',
  image: null as UploadedImage | null,
  isActive: true,
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formFromAddOn(addOn: AddOn) {
  return {
    name: addOn.name,
    price: addOn.price,
    categoryId: addOn.categoryId || '',
    image: addOn.image ? { mediaId: '', r2Key: addOn.imageR2Key || '', url: addOn.image } : null,
    isActive: addOn.isActive,
  }
}

function toPayload(form: typeof EMPTY_FORM) {
  return {
    name: form.name,
    price: Number(form.price),
    categoryId: form.categoryId || undefined,
    image: form.image?.url,
    imageR2Key: form.image?.r2Key || undefined,
    isActive: form.isActive,
  }
}

function CategoryManager({ categories, onClose }: { categories: AddOnCategory[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/admin/addon-categories', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-categories'] })
      setName('')
      toast.success('Category added')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/addon-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addon-categories'] })
      toast.success('Category deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold">Add-on Categories</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Groups shown as tabs in the customer&apos;s &quot;Customize Your Order&quot; dialog (e.g. Cake, Flowers, Balloon Gate).
      </p>

      <div className="mt-3 flex gap-2">
        <Input placeholder="e.g. Cake" value={name} onChange={(e) => setName(e.target.value)} />
        <Button
          onClick={() => name.trim() && createMutation.mutate(name.trim())}
          disabled={createMutation.isPending}
        >
          Add
        </Button>
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2 text-sm">
            <span>
              {cat.name} <span className="text-xs text-muted-foreground">({cat._count?.addOns ?? 0} add-ons)</span>
            </span>
            <button onClick={() => removeMutation.mutate(cat.id)} aria-label="Delete category">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </li>
        ))}
        {categories.length === 0 && <li className="text-xs text-muted-foreground">No categories yet.</li>}
      </ul>
    </div>
  )
}

export function AddOnsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<AddOn | 'new' | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  const { data: addOnsData, isLoading } = useQuery({
    queryKey: ['addons'],
    queryFn: () => api.get<AddOn[]>('/admin/addons?limit=100'),
  })
  const { data: categoriesData } = useQuery({
    queryKey: ['addon-categories'],
    queryFn: () => api.get<AddOnCategory[]>('/admin/addon-categories'),
  })

  const addOns = addOnsData?.data ?? []
  const categories = categoriesData?.data ?? []

  function closeForm() {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing('new')
  }

  function openEdit(addOn: AddOn) {
    setForm(formFromAddOn(addOn))
    setEditing(addOn)
  }

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.post('/admin/addons', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] })
      closeForm()
      toast.success('Add-on created')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof toPayload> }) =>
      api.patch(`/admin/addons/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] })
      closeForm()
      toast.success('Add-on updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      api.patch(`/admin/addons/${id}/toggle`, { field: 'isActive', value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addons'] }),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/addons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons'] })
      toast.success('Add-on deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

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
          <h1 className="font-display text-2xl font-semibold text-primary">Add-ons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Extras customers can add when booking (Cake, Flower Bouquets, Balloon Gate, etc.) — shown in the
            &quot;Customize Your Order&quot; dialog. Assign these to individual products from the product editor.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowCategoryManager((v) => !v)}>
            Manage Categories
          </Button>
          <Button onClick={openCreate}>Add Extra</Button>
        </div>
      </div>

      {showCategoryManager && (
        <div className="mt-4">
          <CategoryManager categories={categories} onClose={() => setShowCategoryManager(false)} />
        </div>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && closeForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing === 'new' ? 'Add Extra' : 'Edit Extra'}</SheetTitle>
          </SheetHeader>

          <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="a-name">Name</Label>
              <Input
                id="a-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Chocolate Cake (1kg)"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="a-price">Price (₹)</Label>
              <Input
                id="a-price"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="a-category">Category</Label>
              <select
                id="a-category"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <ImageDropzone
              label="Image"
              value={form.image}
              onChange={(image) => setForm({ ...form, image })}
              folder="addons"
            />

            <div className="flex items-center justify-between">
              <Label htmlFor="a-active">Active</Label>
              <Switch id="a-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
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
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Used in</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-9 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                </TableRow>
              ))}

            {!isLoading && addOns.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No add-ons yet.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              addOns.map((addOn) => (
                <TableRow key={addOn.id}>
                  <TableCell>
                    {addOn.image ? (
                      <img src={addOn.image} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No image</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{addOn.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{addOn.category?.name ?? '—'}</TableCell>
                  <TableCell>&#8377;{addOn.price}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{addOn._count?.products ?? 0} product(s)</TableCell>
                  <TableCell>
                    <Switch
                      checked={addOn.isActive}
                      onCheckedChange={(value) => toggleMutation.mutate({ id: addOn.id, value })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(addOn)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(addOn.id)} title="Delete">
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
