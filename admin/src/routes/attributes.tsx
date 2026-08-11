import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Pencil, Plus, X } from 'lucide-react'

interface VariantOption {
  name: string
  swatches: string[]
}

interface VariantPreset {
  id: string
  name: string
  options: VariantOption[]
}

type OptionForm = { name: string; swatches: string }

const EMPTY_FORM = { name: '', options: [] as OptionForm[] }

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formFromPreset(preset: VariantPreset) {
  return {
    name: preset.name,
    options: preset.options.map((o) => ({ name: o.name, swatches: o.swatches.join(', ') })),
  }
}

function toPayload(form: typeof EMPTY_FORM) {
  return {
    name: form.name,
    options: form.options
      .filter((o) => o.name.trim())
      .map((o) => ({
        name: o.name.trim(),
        swatches: o.swatches.split(',').map((s) => s.trim()).filter(Boolean),
      })),
  }
}

export function AttributesPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<VariantPreset | 'new' | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['variant-presets'],
    queryFn: () => api.get<VariantPreset[]>('/admin/variant-presets'),
  })
  const presets = data?.data ?? []

  function closeForm() {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing('new')
  }

  function openEdit(preset: VariantPreset) {
    setForm(formFromPreset(preset))
    setEditing(preset)
  }

  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => api.post('/admin/variant-presets', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variant-presets'] })
      closeForm()
      toast.success('Attribute set created')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof toPayload> }) =>
      api.patch(`/admin/variant-presets/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variant-presets'] })
      closeForm()
      toast.success('Attribute set updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/variant-presets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variant-presets'] })
      toast.success('Attribute set deleted')
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
  const submitError = editing === 'new' ? createMutation.error : updateMutation.error

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Attributes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable option sets (e.g. &quot;Balloon Colors&quot;) you define once, then attach to
            any product instead of typing colors every time.
          </p>
        </div>
        <Button onClick={openCreate}>Add Attribute Set</Button>
      </div>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && closeForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing === 'new' ? 'Add Attribute Set' : 'Edit Attribute Set'}</SheetTitle>
          </SheetHeader>

          <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="preset-name">Name</Label>
              <Input
                id="preset-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Balloon Colors"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Options</Label>
              {form.options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Name, e.g. Gold · White"
                    value={o.name}
                    onChange={(e) => {
                      const options = [...form.options]
                      options[i] = { ...options[i], name: e.target.value }
                      setForm({ ...form, options })
                    }}
                  />
                  <Input
                    placeholder="Hex colors, e.g. #D4AF37, #FFFFFF"
                    value={o.swatches}
                    onChange={(e) => {
                      const options = [...form.options]
                      options[i] = { ...options[i], swatches: e.target.value }
                      setForm({ ...form, options })
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setForm({ ...form, options: [...form.options, { name: '', swatches: '' }] })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add option
              </Button>
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

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-md" />)}

        {!isLoading && presets.length === 0 && (
          <p className="text-sm text-muted-foreground">No attribute sets yet.</p>
        )}

        {!isLoading &&
          presets.map((preset) => (
            <div key={preset.id} className="rounded-md border border-border p-4">
              <div className="flex items-start justify-between">
                <p className="font-medium">{preset.name}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(preset)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(preset.id)} title="Delete">
                    Delete
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preset.options.map((o, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 py-1 text-xs"
                  >
                    {o.swatches.length > 0 && (
                      <span className="flex overflow-hidden rounded-full border border-border">
                        {o.swatches.slice(0, 2).map((c, ci) => (
                          <span key={ci} className="h-3 w-3" style={{ backgroundColor: c }} />
                        ))}
                      </span>
                    )}
                    {o.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
