import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { qk } from '@/lib/queryKeys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Pencil, Trash2, ChevronDown, ChevronRight, Upload } from 'lucide-react'

// ── Cities ──────────────────────────────────────────────────────────────

interface City {
  id: string
  name: string
  slug: string
  region: string | null
  isServiceable: boolean
  comingSoon: boolean
  position: number
  deliveryCharge: string
  minOrderValue: string
  _count?: { pincodes: number }
}

const EMPTY_CITY_FORM = { name: '', region: '', deliveryCharge: '0', minOrderValue: '0' }

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formFromCity(city: City) {
  return {
    name: city.name,
    region: city.region ?? '',
    deliveryCharge: city.deliveryCharge,
    minOrderValue: city.minOrderValue,
  }
}

// ── Pincodes (scoped to one city, shown in the expanded row) ──────────────

interface Pincode {
  id: string
  code: string
  cityId: string
  areaName: string | null
  isServiceable: boolean
}

interface ImportPreview {
  added: unknown[]
  updated: unknown[]
  skipped: unknown[]
  invalid: { row: Record<string, string>; reason: string }[]
}

const EMPTY_PINCODE_FORM = { code: '', cityId: '', areaName: '', isServiceable: true }

function CityPincodeManager({ city }: { city: City }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [range, setRange] = useState({ from: '', to: '' })
  const [editing, setEditing] = useState<Pincode | 'new' | null>(null)
  const [form, setForm] = useState(EMPTY_PINCODE_FORM)

  const { data, isLoading } = useQuery({
    queryKey: qk.pincodes.list({ cityId: city.id }),
    queryFn: () => api.get<Pincode[]>(`/admin/pincodes?cityId=${city.id}&limit=200`),
  })

  const pincodes = data?.data ?? []

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: qk.pincodes.all })
    queryClient.invalidateQueries({ queryKey: qk.cities.all })
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, isServiceable }: { id: string; isServiceable: boolean }) =>
      api.patch(`/admin/pincodes/${id}/toggle`, { isServiceable }),
    onSuccess: invalidateAll,
    onError: (err) => toast.error(errorMessage(err)),
  })

  function closeForm() {
    setEditing(null)
    setForm(EMPTY_PINCODE_FORM)
  }
  function openCreate() {
    setForm({ ...EMPTY_PINCODE_FORM, cityId: city.id })
    setEditing('new')
  }
  function openEdit(p: Pincode) {
    setForm({ code: p.code, cityId: p.cityId, areaName: p.areaName ?? '', isServiceable: p.isServiceable })
    setEditing(p)
  }

  const createPincodeMutation = useMutation({
    mutationFn: (payload: typeof EMPTY_PINCODE_FORM) => api.post('/admin/pincodes', payload),
    onSuccess: () => {
      invalidateAll()
      closeForm()
      toast.success('Pincode added')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updatePincodeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: typeof EMPTY_PINCODE_FORM }) =>
      api.patch(`/admin/pincodes/${id}`, payload),
    onSuccess: () => {
      invalidateAll()
      closeForm()
      toast.success('Pincode updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removePincodeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/pincodes/${id}`),
    onSuccess: () => {
      invalidateAll()
      toast.success('Pincode deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing === 'new') {
      createPincodeMutation.mutate(form)
    } else if (editing) {
      updatePincodeMutation.mutate({ id: editing.id, payload: form })
    }
  }

  const bulkRangeMutation = useMutation({
    mutationFn: (payload: { cityId: string; from: string; to: string }) => api.post('/admin/pincodes/bulk', payload),
    onSuccess: () => {
      invalidateAll()
      setRangeOpen(false)
      setRange({ from: '', to: '' })
      toast.success('Pincode range added')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  async function handlePreview() {
    if (!csvFile) return
    const formData = new FormData()
    formData.append('file', csvFile)
    const res = await fetch(
      `${(import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api/v1'}/admin/pincodes/import/preview`,
      { method: 'POST', body: formData, credentials: 'include' }
    )
    const json = await res.json()
    if (json.success) setPreview(json.data)
  }

  async function handleCommit() {
    if (!csvFile) return
    const formData = new FormData()
    formData.append('file', csvFile)
    await fetch(
      `${(import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api/v1'}/admin/pincodes/import/commit`,
      { method: 'POST', body: formData, credentials: 'include' }
    )
    setImportOpen(false)
    setPreview(null)
    setCsvFile(null)
    invalidateAll()
    toast.success('Pincodes imported')
  }

  return (
    <div className="space-y-3 rounded-md bg-secondary/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{pincodes.length} pincode(s) in {city.name}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={openCreate}>Add Pincode</Button>

          <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline">Add Range</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Pincode Range for {city.name}</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label>From</Label>
                  <Input value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label>To</Label>
                  <Input value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => bulkRangeMutation.mutate({ cityId: city.id, ...range })}
                  disabled={!range.from || !range.to || bulkRangeMutation.isPending}
                >
                  {bulkRangeMutation.isPending ? 'Adding...' : 'Add Range'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline"><Upload className="mr-1 h-3.5 w-3.5" />Import CSV</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Pincodes for {city.name}</DialogTitle>
              </DialogHeader>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => {
                  setCsvFile(e.target.files?.[0] ?? null)
                  setPreview(null)
                }}
              />
              {preview && (
                <div className="mt-4 text-sm">
                  <p>Added: {preview.added.length}</p>
                  <p>Updated (existing): {preview.updated.length}</p>
                  <p>Skipped: {preview.skipped.length}</p>
                  <p className="text-destructive">Invalid: {preview.invalid.length}</p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={handlePreview} disabled={!csvFile}>
                  Preview
                </Button>
                <Button onClick={handleCommit} disabled={!preview}>
                  Commit Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading && <Skeleton className="h-16 w-full" />}

      {!isLoading && (
        <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Serviceable</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pincodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No pincodes yet for {city.name}.
                  </TableCell>
                </TableRow>
              )}
              {pincodes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.code}</TableCell>
                  <TableCell>{p.areaName ?? '—'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={p.isServiceable}
                      onCheckedChange={(value) => toggleMutation.mutate({ id: p.id, isServiceable: value })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removePincodeMutation.mutate(p.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && closeForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing === 'new' ? `Add Pincode to ${city.name}` : 'Edit Pincode'}</SheetTitle>
          </SheetHeader>

          <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="p-code">Pincode</Label>
              <Input
                id="p-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                maxLength={6}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-area">Area Name</Label>
              <Input
                id="p-area"
                value={form.areaName}
                onChange={(e) => setForm({ ...form, areaName: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="p-serviceable">Serviceable</Label>
              <Switch
                id="p-serviceable"
                checked={form.isServiceable}
                onCheckedChange={(v) => setForm({ ...form, isServiceable: v })}
              />
            </div>

            <SheetFooter>
              <Button type="submit" disabled={createPincodeMutation.isPending || updatePincodeMutation.isPending}>
                {createPincodeMutation.isPending || updatePincodeMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────

export function CitiesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<City | 'new' | null>(null)
  const [form, setForm] = useState(EMPTY_CITY_FORM)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: qk.cities.list({ search }),
    queryFn: () => api.get<City[]>(`/admin/cities?search=${encodeURIComponent(search)}&limit=50`),
  })

  function closeForm() {
    setEditing(null)
    setForm(EMPTY_CITY_FORM)
  }
  function openCreate() {
    setForm(EMPTY_CITY_FORM)
    setEditing('new')
  }
  function openEdit(city: City) {
    setForm(formFromCity(city))
    setEditing(city)
  }

  const createMutation = useMutation({
    mutationFn: (payload: typeof EMPTY_CITY_FORM) => api.post('/admin/cities', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cities.all })
      closeForm()
      toast.success('City created')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: typeof EMPTY_CITY_FORM }) =>
      api.patch(`/admin/cities/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cities.all })
      closeForm()
      toast.success('City updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cities.all })
      toast.success('City deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: boolean }) =>
      api.patch(`/admin/cities/${id}/toggle`, { field, value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.cities.all }),
    onError: (err) => toast.error(errorMessage(err)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing === 'new') {
      createMutation.mutate(form)
    } else if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form })
    }
  }

  const cities = data?.data ?? []
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Cities & Pincodes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything about where you deliver, in one place. Click a city&apos;s arrow to manage its pincodes —
            add one at a time, add a numeric range, or import a CSV.
          </p>
        </div>
        <Button onClick={openCreate}>Add City</Button>
      </div>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && closeForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing === 'new' ? 'Add City' : 'Edit City'}</SheetTitle>
          </SheetHeader>
          <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="city-name">Name</Label>
              <Input
                id="city-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city-region">Region</Label>
              <Input
                id="city-region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="Delhi NCR"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="city-delivery">Delivery charge</Label>
                <Input
                  id="city-delivery"
                  type="number"
                  value={form.deliveryCharge}
                  onChange={(e) => setForm({ ...form, deliveryCharge: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="city-min-order">Min order value</Label>
                <Input
                  id="city-min-order"
                  type="number"
                  value={form.minOrderValue}
                  onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
                />
              </div>
            </div>
            <SheetFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Input
        placeholder="Search cities..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 max-w-xs"
      />

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Pincodes</TableHead>
              <TableHead>Serviceable</TableHead>
              <TableHead>Coming Soon</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7}>Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && cities.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No cities found.
                </TableCell>
              </TableRow>
            )}
            {cities.map((city) => (
              <>
                <TableRow key={city.id}>
                  <TableCell>
                    <button
                      onClick={() => setExpandedId(expandedId === city.id ? null : city.id)}
                      aria-label="Toggle pincodes"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {expandedId === city.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{city.name}</TableCell>
                  <TableCell>
                    {city.region ? <Badge variant="secondary">{city.region}</Badge> : '—'}
                  </TableCell>
                  <TableCell>{city._count?.pincodes ?? 0}</TableCell>
                  <TableCell>
                    <Switch
                      checked={city.isServiceable}
                      onCheckedChange={(value) =>
                        toggleMutation.mutate({ id: city.id, field: 'isServiceable', value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={city.comingSoon}
                      onCheckedChange={(value) =>
                        toggleMutation.mutate({ id: city.id, field: 'comingSoon', value })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(city)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(city.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedId === city.id && (
                  <TableRow key={`${city.id}-expanded`}>
                    <TableCell colSpan={7}>
                      <CityPincodeManager city={city} />
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
