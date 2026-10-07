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

interface City {
  id: string
  name: string
}

interface Slot {
  id: string
  label: string
  startTime: string
  endTime: string
  capacity: number
  surgeCharge: string
  cityId: string | null
  city: City | null
  isActive: boolean
  position: number
}

const EMPTY_FORM = {
  label: '',
  startTime: '10:00',
  endTime: '13:00',
  capacity: '1',
  surgeCharge: '0',
  cityId: '',
  position: '0',
  isActive: true,
}

type Form = typeof EMPTY_FORM

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function toPayload(form: Form) {
  return {
    label: form.label.trim(),
    startTime: form.startTime,
    endTime: form.endTime,
    capacity: Number(form.capacity) || 1,
    surgeCharge: Number(form.surgeCharge) || 0,
    cityId: form.cityId || null,
    position: Number(form.position) || 0,
    isActive: form.isActive,
  }
}

export function SlotsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Slot | 'new' | null>(null)
  const [form, setForm] = useState<Form>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['slots'],
    queryFn: () => api.get<Slot[]>('/admin/slots?limit=100'),
  })
  const { data: citiesData } = useQuery({
    queryKey: ['cities-for-slots'],
    queryFn: () => api.get<City[]>('/admin/cities?limit=100'),
  })

  const slots = data?.data ?? []
  const cities = citiesData?.data ?? []

  function closeForm() {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, position: String(slots.length + 1) })
    setEditing('new')
  }

  function openEdit(s: Slot) {
    setForm({
      label: s.label,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: String(s.capacity),
      surgeCharge: String(Number(s.surgeCharge)),
      cityId: s.cityId ?? '',
      position: String(s.position),
      isActive: s.isActive,
    })
    setEditing(s)
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: ReturnType<typeof toPayload> }) =>
      id ? api.patch(`/admin/slots/${id}`, payload) : api.post('/admin/slots', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      closeForm()
      toast.success('Time slot saved')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      api.patch(`/admin/slots/${id}/toggle`, { field: 'isActive', value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['slots'] }),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/slots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      toast.success('Time slot deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.startTime >= form.endTime) {
      toast.error('End time must be after the start time')
      return
    }
    saveMutation.mutate({ id: typeof editing === 'object' && editing ? editing.id : null, payload: toPayload(form) })
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Time Slots</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The arrival times customers pick at checkout (for example 10:00 – 13:00). Once a city has any active slot,
            customers must choose one, and the slot shows on the order. With no slots, orders have no time and you
            have to confirm it by phone. Capacity is how many bookings one slot can take per day.
          </p>
        </div>
        <Button onClick={openCreate}>New Slot</Button>
      </div>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && closeForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing === 'new' ? 'New Time Slot' : 'Edit Time Slot'}</SheetTitle>
          </SheetHeader>

          <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="s-label">Label</Label>
              <Input
                id="s-label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Morning"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="s-start">Start (IST)</Label>
                <Input id="s-start" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-end">End (IST)</Label>
                <Input id="s-end" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="s-capacity">Bookings per day</Label>
                <Input id="s-capacity" type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-surge">Extra charge (₹)</Label>
                <Input id="s-surge" type="number" min={0} value={form.surgeCharge} onChange={(e) => setForm({ ...form, surgeCharge: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="s-city">City</Label>
              <select
                id="s-city"
                value={form.cityId}
                onChange={(e) => setForm({ ...form, cityId: e.target.value })}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="s-position">Order in list</Label>
              <Input id="s-position" type="number" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="s-active">Active</Label>
              <Switch id="s-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>

            <SheetFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <div className="mt-6 overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Per day</TableHead>
              <TableHead>Extra charge</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && slots.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No time slots yet — orders are saved without a time. Add your first slot.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              slots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.label}</TableCell>
                  <TableCell className="text-sm">
                    {s.startTime} – {s.endTime}
                  </TableCell>
                  <TableCell className="text-sm">{s.city?.name ?? 'All cities'}</TableCell>
                  <TableCell className="text-sm">{s.capacity}</TableCell>
                  <TableCell className="text-sm">{Number(s.surgeCharge) > 0 ? `₹${Number(s.surgeCharge)}` : '—'}</TableCell>
                  <TableCell>
                    <Switch checked={s.isActive} onCheckedChange={(value) => toggleMutation.mutate({ id: s.id, value })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Delete the "${s.label}" slot?`)) removeMutation.mutate(s.id)
                        }}
                        title="Delete"
                      >
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
