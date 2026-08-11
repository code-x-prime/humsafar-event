import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Phone, Mail, Trash2 } from 'lucide-react'

interface Enquiry {
  id: string
  name: string
  phone: string
  email: string | null
  eventType: string | null
  eventDate: string | null
  city: string | null
  message: string | null
  source: 'CONTACT' | 'POPUP' | 'PRODUCT' | 'WAITLIST' | 'URGENT_BOOKING'
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED'
  adminNote: string | null
  createdAt: string
}

type StatusFilter = 'ALL' | 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED'

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-600',
  CONTACTED: 'bg-amber-500/10 text-amber-600',
  CONVERTED: 'bg-green-500/10 text-green-600',
  CLOSED: 'bg-muted text-muted-foreground',
}

const STATUS_OPTIONS: Enquiry['status'][] = ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED']

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

export function EnquiriesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('NEW')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', { statusFilter }],
    queryFn: () => api.get<Enquiry[]>(`/admin/enquiries?limit=100${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}`),
  })

  const enquiries = data?.data ?? []

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.patch(`/admin/enquiries/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      toast.success('Updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/enquiries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      toast.success('Enquiry deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function toggleExpand(e: Enquiry) {
    if (expandedId === e.id) {
      setExpandedId(null)
    } else {
      setExpandedId(e.id)
      setNoteDraft(e.adminNote ?? '')
      // Opening a NEW enquiry marks it as contacted so the list naturally
      // clears itself as the admin works through it — matches how the
      // reviews page's PENDING filter behaves.
      if (e.status === 'NEW') {
        updateMutation.mutate({ id: e.id, payload: { status: 'CONTACTED' } })
      }
    }
  }

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-primary">Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Messages submitted from the Contact Us page and other enquiry forms on the site.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED', 'ALL'] as StatusFilter[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)}

        {!isLoading && enquiries.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No enquiries here.
          </p>
        )}

        {!isLoading &&
          enquiries.map((e) => {
            const isExpanded = expandedId === e.id
            return (
              <div key={e.id} className="rounded-md border border-border bg-background">
                <button
                  onClick={() => toggleExpand(e)}
                  className="flex w-full flex-wrap items-center gap-3 p-3 text-left"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.eventType ? `${e.eventType} · ` : ''}
                      {e.message ?? 'No message'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                  <Badge className={STATUS_STYLES[e.status]}>{e.status}</Badge>
                </button>

                {isExpanded && (
                  <div className="space-y-3 border-t border-border p-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <a href={`tel:${e.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                        <Phone className="h-3.5 w-3.5" /> {e.phone}
                      </a>
                      {e.email && (
                        <a href={`mailto:${e.email}`} className="flex items-center gap-1.5 text-primary hover:underline">
                          <Mail className="h-3.5 w-3.5" /> {e.email}
                        </a>
                      )}
                      {e.city && <span className="text-muted-foreground">{e.city}</span>}
                      <span className="text-muted-foreground">Source: {e.source}</span>
                    </div>

                    {e.message && (
                      <div className="rounded-md bg-secondary/30 p-3 text-sm">{e.message}</div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      {STATUS_OPTIONS.map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={e.status === s ? 'default' : 'outline'}
                          onClick={() => updateMutation.mutate({ id: e.id, payload: { status: s } })}
                        >
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <Textarea
                        rows={2}
                        placeholder="Internal note (not visible to the customer)"
                        value={noteDraft}
                        onChange={(ev) => setNoteDraft(ev.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMutation.mutate(e.id)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: e.id, payload: { adminNote: noteDraft } })}
                          disabled={updateMutation.isPending}
                        >
                          Save Note
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
