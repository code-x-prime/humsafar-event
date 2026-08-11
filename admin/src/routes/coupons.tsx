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
import { Pencil } from 'lucide-react'

interface Category {
  id: string
  name: string
  parentId: string | null
}

interface Coupon {
  code: string
  type: 'PERCENTAGE' | 'FLAT'
  value: string
  maxDiscount: string | null
  minOrderValue: string | null
  usageLimit: number | null
  perUserLimit: number | null
  newUserOnly: boolean
  minRepeatOrders: number | null
  applicableCategoryIds: string[]
  usedCount: number
  windowStart: string | null
  windowEnd: string | null
  isActive: boolean
}

type EligibilityMode = 'ALL' | 'NEW' | 'REPEAT'

const EMPTY_FORM = {
  code: '',
  type: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
  value: '',
  maxDiscount: '',
  minOrderValue: '',
  usageLimit: '',
  perUserLimit: '',
  eligibilityMode: 'ALL' as EligibilityMode,
  minRepeatOrders: '',
  applicableCategoryIds: [] as string[],
  windowStart: '',
  windowEnd: '',
  isActive: true,
}

type Form = typeof EMPTY_FORM

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formFromCoupon(c: Coupon): Form {
  return {
    code: c.code,
    type: c.type,
    value: c.value,
    maxDiscount: c.maxDiscount ?? '',
    minOrderValue: c.minOrderValue ?? '',
    usageLimit: c.usageLimit?.toString() ?? '',
    perUserLimit: c.perUserLimit?.toString() ?? '',
    eligibilityMode: c.newUserOnly ? 'NEW' : c.minRepeatOrders ? 'REPEAT' : 'ALL',
    minRepeatOrders: c.minRepeatOrders?.toString() ?? '',
    applicableCategoryIds: c.applicableCategoryIds,
    windowStart: c.windowStart ? c.windowStart.slice(0, 10) : '',
    windowEnd: c.windowEnd ? c.windowEnd.slice(0, 10) : '',
    isActive: c.isActive,
  }
}

function toPayload(form: Form) {
  return {
    code: form.code.toUpperCase().trim(),
    type: form.type,
    value: Number(form.value),
    maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
    minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
    usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
    perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : undefined,
    newUserOnly: form.eligibilityMode === 'NEW',
    minRepeatOrders: form.eligibilityMode === 'REPEAT' && form.minRepeatOrders ? Number(form.minRepeatOrders) : undefined,
    applicableCategoryIds: form.applicableCategoryIds,
    windowStart: form.windowStart || undefined,
    windowEnd: form.windowEnd || undefined,
    isActive: form.isActive,
  }
}

export function CouponsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null)
  const [form, setForm] = useState<Form>(EMPTY_FORM)

  const { data: couponsData, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => api.get<Coupon[]>('/admin/coupons?limit=100'),
  })
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/admin/categories?limit=200'),
  })

  const coupons = couponsData?.data ?? []
  const categories = categoriesData?.data ?? []

  function closeForm() {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing('new')
  }

  function openEdit(coupon: Coupon) {
    setForm(formFromCoupon(coupon))
    setEditing(coupon)
  }

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.post('/admin/coupons', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      closeForm()
      toast.success('Coupon created')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: ReturnType<typeof toPayload> }) =>
      api.patch(`/admin/coupons/${code}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      closeForm()
      toast.success('Coupon updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ code, value }: { code: string; value: boolean }) =>
      api.patch(`/admin/coupons/${code}/toggle`, { field: 'isActive', value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (code: string) => api.delete(`/admin/coupons/${code}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Coupon deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = toPayload(form)
    if (editing === 'new') {
      createMutation.mutate(payload)
    } else if (editing) {
      updateMutation.mutate({ code: editing.code, payload })
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Coupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Discount codes customers enter at checkout. Set validity dates, order value thresholds, usage limits,
            restrict a code to new or repeat customers, or limit it to specific categories.
          </p>
        </div>
        <Button onClick={openCreate}>New Coupon</Button>
      </div>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && closeForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing === 'new' ? 'New Coupon' : `Edit ${typeof editing === 'object' ? editing?.code : ''}`}</SheetTitle>
          </SheetHeader>

          <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="c-code">Code</Label>
              <Input
                id="c-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WELCOME50"
                disabled={editing !== 'new'}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="c-type">Type</Label>
                <select
                  id="c-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'PERCENTAGE' | 'FLAT' })}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none"
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FLAT">Flat Amount</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-value">{form.type === 'PERCENTAGE' ? 'Percent Off' : 'Amount Off (₹)'}</Label>
                <Input
                  id="c-value"
                  type="number"
                  min="0"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  required
                />
              </div>
            </div>

            {form.type === 'PERCENTAGE' && (
              <div className="space-y-1">
                <Label htmlFor="c-max">Max Discount (₹, optional)</Label>
                <Input
                  id="c-max"
                  type="number"
                  min="0"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="Cap the discount amount"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="c-min-order">Minimum Order Value (₹, optional)</Label>
              <Input
                id="c-min-order"
                type="number"
                min="0"
                value={form.minOrderValue}
                onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="c-usage-limit">Total Usage Limit</Label>
                <Input
                  id="c-usage-limit"
                  type="number"
                  min="1"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-per-user-limit">Per-User Limit</Label>
                <Input
                  id="c-per-user-limit"
                  type="number"
                  min="1"
                  value={form.perUserLimit}
                  onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="c-start">Valid From</Label>
                <Input id="c-start" type="date" value={form.windowStart} onChange={(e) => setForm({ ...form, windowStart: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-end">Valid Until</Label>
                <Input id="c-end" type="date" value={form.windowEnd} onChange={(e) => setForm({ ...form, windowEnd: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="c-eligibility">Who Can Use This</Label>
              <select
                id="c-eligibility"
                value={form.eligibilityMode}
                onChange={(e) => setForm({ ...form, eligibilityMode: e.target.value as EligibilityMode })}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none"
              >
                <option value="ALL">Everyone</option>
                <option value="NEW">New customers only (first order)</option>
                <option value="REPEAT">Repeat customers only (returning)</option>
              </select>
              {form.eligibilityMode === 'NEW' && (
                <p className="text-xs text-muted-foreground">Rejected for anyone with a prior completed order.</p>
              )}
            </div>

            {form.eligibilityMode === 'REPEAT' && (
              <div className="space-y-1">
                <Label htmlFor="c-min-repeat">Minimum Completed Orders</Label>
                <Input
                  id="c-min-repeat"
                  type="number"
                  min="1"
                  value={form.minRepeatOrders}
                  onChange={(e) => setForm({ ...form, minRepeatOrders: e.target.value })}
                  placeholder="e.g. 2"
                  required
                />
                <p className="text-xs text-muted-foreground">Customer needs at least this many completed prior orders to use this coupon.</p>
              </div>
            )}

            <div className="space-y-1">
              <Label>Applies To Categories (optional)</Label>
              <p className="text-xs text-muted-foreground">Leave empty to apply to every category. Otherwise, cart must contain a product from at least one selected category.</p>
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground">No categories yet.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary/50">
                      <input
                        type="checkbox"
                        checked={form.applicableCategoryIds.includes(cat.id)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            applicableCategoryIds: e.target.checked
                              ? [...form.applicableCategoryIds, cat.id]
                              : form.applicableCategoryIds.filter((id) => id !== cat.id),
                          })
                        }
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="c-active">Active</Label>
              <Switch id="c-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
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
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Eligibility</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-9 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                </TableRow>
              ))}

            {!isLoading && coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No coupons yet.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              coupons.map((c) => (
                <TableRow key={c.code}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell className="text-sm">
                    {c.type === 'PERCENTAGE' ? `${c.value}%` : `₹${c.value}`}
                    {c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.windowStart ? new Date(c.windowStart).toLocaleDateString('en-IN') : 'Any time'}
                    {' – '}
                    {c.windowEnd ? new Date(c.windowEnd).toLocaleDateString('en-IN') : 'No end'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.usedCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ''} used
                    {c.perUserLimit ? ` · ${c.perUserLimit}/user` : ''}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.newUserOnly ? 'New customers' : c.minRepeatOrders ? `${c.minRepeatOrders}+ orders` : 'Everyone'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.applicableCategoryIds.length > 0 ? `${c.applicableCategoryIds.length} selected` : 'All'}
                  </TableCell>
                  <TableCell>
                    <Switch checked={c.isActive} onCheckedChange={(value) => toggleMutation.mutate({ code: c.code, value })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(c.code)} title="Delete">
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
