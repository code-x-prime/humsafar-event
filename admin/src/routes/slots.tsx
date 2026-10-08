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

interface Blackout {
  id: string
  date: string
  timeSlotId: string | null
  cityId: string | null
  reason: string | null
  timeSlot: { label: string; startTime: string; endTime: string } | null
  city: City | null
}

// Dates (or single slots on a date) the admin has switched off. Everything not
// listed here stays open, however far ahead the customer books.
function ClosedDates({ slots, cities }: { slots: Slot[]; cities: City[] }) {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [slotId, setSlotId] = useState('')
  const [cityId, setCityId] = useState('')
  const [reason, setReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['slot-blackouts'],
    queryFn: () => api.get<Blackout[]>('/admin/slot-blackouts?limit=200&sortBy=date&sortOrder=asc'),
  })
  const rows = (data?.data ?? []).filter((b) => b.date.slice(0, 10) >= today)

  const addMutation = useMutation({
    mutationFn: async () => {
      const last = to || from
      const days: string[] = []
      for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${last}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
        days.push(d.toISOString().slice(0, 10))
      }
      if (days.length > 92) throw new Error('Pick at most 3 months at a time')
      for (const date of days) {
        await api.post('/admin/slot-blackouts', {
          date,
          timeSlotId: slotId || undefined,
          cityId: cityId || undefined,
          reason: reason.trim() || undefined,
        })
      }
      return days.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['slot-blackouts'] })
      setFrom('')
      setTo('')
      setReason('')
      toast.success(`Closed ${count} day${count === 1 ? '' : 's'}`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/slot-blackouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slot-blackouts'] })
      toast.success('Reopened')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <div className="mt-10">
      <h2 className="font-display text-xl font-semibold text-primary">Closed Dates &amp; Slots</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every date and every slot is open by default, for any date ahead. Close a whole day, or just one slot, only when
        you can&apos;t take bookings. Customers then see it as &quot;Closed&quot; at checkout. Delete the row to reopen it.
      </p>

      <form
        className="mt-4 grid grid-cols-1 gap-3 rounded-md border border-border p-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (to && to < from) return toast.error('"To" date is before "From" date')
          addMutation.mutate()
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="b-from">From date</Label>
          <Input id="b-from" type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="b-to">To date (optional, for a range)</Label>
          <Input id="b-to" type="date" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="b-slot">Which slot</Label>
          <select
            id="b-slot"
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none"
          >
            <option value="">Whole day (all slots)</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.startTime}–{s.endTime})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="b-city">City</Label>
          <select
            id="b-city"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
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
        <div className="space-y-1 sm:col-span-1">
          <Label htmlFor="b-reason">Reason (only you see this)</Label>
          <Input id="b-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Team on leave" />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? 'Closing...' : 'Close it'}
          </Button>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Nothing closed — all upcoming dates and slots are open.
                </TableCell>
              </TableRow>
            )}
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">
                  {new Date(b.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                </TableCell>
                <TableCell className="text-sm">
                  {b.timeSlot ? `${b.timeSlot.label} (${b.timeSlot.startTime}–${b.timeSlot.endTime})` : 'Whole day'}
                </TableCell>
                <TableCell className="text-sm">{b.city?.name ?? 'All cities'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.reason ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(b.id)}>
                    Reopen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
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

      <ClosedDates slots={slots} cities={cities} />
    </div>
  )
}
