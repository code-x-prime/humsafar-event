import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { MultiImageDropzone, type UploadedProductImage } from '@/components/MultiImageDropzone'
import { Star, Eye, EyeOff, Trash2, Reply, Pencil, Plus, MapPin, Search, Loader2, X } from 'lucide-react'

// One manager for both review lists (decoration reviews and Shop With Us
// reviews) — they share the same shape and the same admin actions, only the
// API paths and wording differ, so each route page just passes a config.
export interface ReviewsManagerConfig {
  title: string
  description: string
  reviewsPath: string
  productsPath: string
  queryKey: string
  imageFolder: string
}

type Status = 'PENDING' | 'APPROVED' | 'REJECTED'
type Source = 'CUSTOMER' | 'ADMIN'

interface Review {
  id: string
  orderId: string | null
  rating: number
  title: string | null
  comment: string | null
  status: Status
  source: Source
  reviewerName: string | null
  reviewerCity: string | null
  adminReply: string | null
  isFeatured: boolean
  createdAt: string
  product: { id: string; title: string }
  user: { id: string; name: string | null; email: string | null; phone: string | null } | null
  media: { id: string; r2Key: string; url: string }[]
}

interface ProductOption {
  id: string
  title: string
}

interface FormState {
  product: ProductOption | null
  reviewerName: string
  reviewerCity: string
  rating: number
  title: string
  comment: string
  date: string
  status: 'APPROVED' | 'REJECTED'
  images: UploadedProductImage[]
}

const MAX_IMAGES = 5

// What the admin sees for each status. APPROVED/REJECTED are the stored
// values; "Visible"/"Hidden" says what they actually do on the website.
const STATUS_LABEL: Record<Status, string> = { PENDING: 'Pending', APPROVED: 'Visible', REJECTED: 'Hidden' }
const STATUS_STYLES: Record<Status, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600',
  APPROVED: 'bg-green-500/10 text-green-600',
  REJECTED: 'bg-destructive/10 text-destructive',
}
const SOURCE_STYLES: Record<Source, string> = {
  CUSTOMER: 'bg-blue-500/10 text-blue-600',
  ADMIN: 'bg-purple-500/10 text-purple-600',
}

const STATUS_FILTERS: { value: Status | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Visible' },
  { value: 'REJECTED', label: 'Hidden' },
]
const SOURCE_FILTERS: { value: Source | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All sources' },
  { value: 'CUSTOMER', label: 'Customers' },
  { value: 'ADMIN', label: 'Added by admin' },
]

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

// en-CA formats as YYYY-MM-DD in local time, which is what <input type="date"> wants.
function localDate(value?: string) {
  return (value ? new Date(value) : new Date()).toLocaleDateString('en-CA')
}

function emptyForm(): FormState {
  return {
    product: null,
    reviewerName: '',
    reviewerCity: '',
    rating: 5,
    title: '',
    comment: '',
    date: localDate(),
    status: 'APPROVED',
    images: [],
  }
}

function formFromReview(review: Review): FormState {
  return {
    product: review.product,
    reviewerName: review.reviewerName || '',
    reviewerCity: review.reviewerCity || '',
    rating: review.rating,
    title: review.title || '',
    comment: review.comment || '',
    date: localDate(review.createdAt),
    status: review.status === 'REJECTED' ? 'REJECTED' : 'APPROVED',
    images: review.media.map((m) => ({ mediaId: m.id, r2Key: m.r2Key, url: m.url })),
  }
}

function StarsDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
      ))}
    </div>
  )
}

function RatingInput({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n === 1 ? '' : 's'}`}>
          <Star className={`h-6 w-6 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{value} / 5</span>
    </div>
  )
}

// Search-and-pick a product by name — the product lists are long, so a plain
// dropdown of everything would be unusable. Searches only after 2+ characters.
function ProductPicker({
  productsPath,
  value,
  onChange,
  disabled,
}: {
  productsPath: string
  value: ProductOption | null
  onChange: (next: ProductOption | null) => void
  disabled?: boolean
}) {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 400)
    return () => clearTimeout(t)
  }, [term])

  const canSearch = !value && debounced.length >= 2
  const { data, isFetching } = useQuery({
    queryKey: ['review-product-picker', productsPath, debounced],
    queryFn: () => api.get<ProductOption[]>(`${productsPath}?limit=8&search=${encodeURIComponent(debounced)}`),
    enabled: canSearch,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
        <span className="truncate font-medium">{value.title}</span>
        {!disabled && (
          <button type="button" onClick={() => onChange(null)} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
            Change
          </button>
        )}
      </div>
    )
  }

  const options = canSearch ? (data?.data ?? []) : []

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-8 pr-8" placeholder="Search product name…" value={term} onChange={(e) => setTerm(e.target.value)} autoComplete="off" />
        {isFetching && canSearch && (
          <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {term.trim().length > 0 && term.trim().length < 2 && <p className="text-xs text-muted-foreground">Type at least 2 characters…</p>}
      {canSearch && !isFetching && options.length === 0 && <p className="text-xs text-muted-foreground">No products found.</p>}
      {options.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border">
          {options.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange({ id: p.id, title: p.title })}
              className="block w-full truncate border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-secondary"
            >
              {p.title}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReviewsManager({ config }: { config: ReviewsManagerConfig }) {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<Status | 'ALL'>('ALL')
  const [sourceFilter, setSourceFilter] = useState<Source | 'ALL'>('ALL')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchDraft.trim()), 400)
    return () => clearTimeout(t)
  }, [searchDraft])

  const { data, isLoading } = useQuery({
    queryKey: [config.queryKey, { statusFilter, sourceFilter, search }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (sourceFilter !== 'ALL') params.set('source', sourceFilter)
      if (search) params.set('search', search)
      return api.get<Review[]>(`${config.reviewsPath}?${params.toString()}`)
    },
    placeholderData: keepPreviousData,
  })

  const reviews = data?.data ?? []
  const refresh = () => queryClient.invalidateQueries({ queryKey: [config.queryKey] })

  // Quick one-click actions on a card: show/hide, save a reply.
  const patchMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.patch(`${config.reviewsPath}/${id}`, payload),
    onSuccess: refresh,
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`${config.reviewsPath}/${id}`),
    onSuccess: () => {
      refresh()
      toast.success('Review deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editingId ? api.patch(`${config.reviewsPath}/${editingId}`, payload) : api.post(config.reviewsPath, payload),
    onSuccess: () => {
      refresh()
      toast.success(editingId ? 'Review updated' : 'Review added')
      closeForm()
    },
    onError: (err) => setFormError(errorMessage(err)),
  })

  function setStatus(id: string, status: Status) {
    patchMutation.mutate(
      { id, payload: { status } },
      { onSuccess: () => toast.success(status === 'APPROVED' ? 'Review is now visible on the website' : 'Review hidden from the website') }
    )
  }

  function submitReply(id: string) {
    patchMutation.mutate(
      { id, payload: { adminReply: replyText } },
      {
        onSuccess: () => {
          toast.success('Reply saved')
          setReplyingId(null)
          setReplyText('')
        },
      }
    )
  }

  function confirmDelete(review: Review) {
    if (window.confirm('Delete this review permanently? This cannot be undone.')) {
      removeMutation.mutate(review.id)
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(review: Review) {
    setEditingId(review.id)
    setForm(formFromReview(review))
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!form.product) return setFormError('Please choose a product for this review.')
    if (!form.reviewerName.trim()) return setFormError('Reviewer name is required.')

    const common = {
      reviewerName: form.reviewerName.trim(),
      rating: form.rating,
      status: form.status,
      // Noon avoids a timezone shift pushing the chosen date to the previous day.
      createdAt: form.date ? new Date(`${form.date}T12:00:00`).toISOString() : undefined,
      media: form.images.map((i) => ({ r2Key: i.r2Key, url: i.url })),
    }

    if (editingId) {
      // Empty strings are sent on purpose when editing so a field can be cleared.
      saveMutation.mutate({
        ...common,
        reviewerCity: form.reviewerCity.trim(),
        title: form.title.trim(),
        comment: form.comment.trim(),
      })
    } else {
      saveMutation.mutate({
        ...common,
        productId: form.product.id,
        reviewerCity: form.reviewerCity.trim() || undefined,
        title: form.title.trim() || undefined,
        comment: form.comment.trim() || undefined,
      })
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">{config.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{config.description}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Add Review
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex w-fit gap-1 rounded-md border border-border p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex w-fit gap-1 rounded-md border border-border p-1">
          {SOURCE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSourceFilter(f.value)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                sourceFilter === f.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name, city, text…" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-md" />)}

        {!isLoading && reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews here.</p>}

        {!isLoading &&
          reviews.map((review) => {
            const displayName = review.reviewerName || review.user?.name || 'Customer'
            return (
              <div key={review.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StarsDisplay rating={review.rating} />
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[review.status]}`}>
                        {STATUS_LABEL[review.status]}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_STYLES[review.source]}`}>
                        {review.source === 'ADMIN' ? 'Added by admin' : review.orderId ? 'Customer · Verified order' : 'Customer'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{review.product.title}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>by {displayName}</span>
                      {review.reviewerCity && (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {review.reviewerCity}
                        </span>
                      )}
                      <span>{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </p>
                    {review.source === 'CUSTOMER' && review.user && (review.user.email || review.user.phone) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Account: {[review.user.email, review.user.phone].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {review.status !== 'APPROVED' && (
                      <Button variant="outline" size="sm" onClick={() => setStatus(review.id, 'APPROVED')}>
                        <Eye className="mr-1 h-3.5 w-3.5 text-green-600" />
                        {review.status === 'PENDING' ? 'Approve' : 'Show'}
                      </Button>
                    )}
                    {review.status !== 'REJECTED' && (
                      <Button variant="outline" size="sm" onClick={() => setStatus(review.id, 'REJECTED')}>
                        <EyeOff className="mr-1 h-3.5 w-3.5" />
                        Hide
                      </Button>
                    )}
                    {review.source === 'ADMIN' && (
                      <Button variant="outline" size="sm" onClick={() => openEdit(review)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyingId(review.id)
                        setReplyText(review.adminReply || '')
                      }}
                    >
                      <Reply className="mr-1 h-3.5 w-3.5" />
                      Reply
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => confirmDelete(review)} disabled={removeMutation.isPending}>
                      <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" />
                      Delete
                    </Button>
                  </div>
                </div>

                {review.title && <p className="mt-2 text-sm font-semibold">{review.title}</p>}
                {review.comment && <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>}

                {review.media.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {review.media.map((m) => (
                      <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                        <img src={m.url} alt="" className="h-16 w-16 rounded-md border border-border object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                {review.adminReply && replyingId !== review.id && (
                  <div className="mt-2 rounded-md bg-secondary/40 p-2.5 text-xs">
                    <span className="font-semibold">Your reply: </span>
                    {review.adminReply}
                  </div>
                )}

                {replyingId === review.id && (
                  <div className="mt-2 flex flex-col gap-2">
                    <Textarea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a public reply..." />
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setReplyingId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => submitReply(review.id)} disabled={!replyText.trim() || patchMutation.isPending}>
                        Save Reply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
      </div>

      <Sheet open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Review' : 'Add Review'}</SheetTitle>
          </SheetHeader>

          <form className="flex flex-col gap-4 px-4 pb-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label>Product</Label>
              <ProductPicker
                productsPath={config.productsPath}
                value={form.product}
                onChange={(product) => setForm({ ...form, product })}
                disabled={!!editingId}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="review-name">Reviewer name</Label>
              <Input
                id="review-name"
                placeholder="e.g. Nimisha Nair"
                value={form.reviewerName}
                onChange={(e) => setForm({ ...form, reviewerName: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="review-city">City (optional)</Label>
              <Input
                id="review-city"
                placeholder="e.g. Gurugram"
                value={form.reviewerCity}
                onChange={(e) => setForm({ ...form, reviewerCity: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>Rating</Label>
              <RatingInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="review-title">Headline (optional)</Label>
              <Input
                id="review-title"
                placeholder="e.g. Perfect for our anniversary"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="review-comment">Review</Label>
              <Textarea
                id="review-comment"
                rows={4}
                placeholder="What did the customer say?"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="review-date">Review date</Label>
              <Input id="review-date" type="date" value={form.date} max={localDate()} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>

            <MultiImageDropzone
              label="Photos"
              value={form.images}
              onChange={(images) => setForm({ ...form, images })}
              folder={config.imageFolder}
              max={MAX_IMAGES}
            />

            <div className="space-y-1">
              <Label htmlFor="review-status">Visibility</Label>
              <select
                id="review-status"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as FormState['status'] })}
              >
                <option value="APPROVED">Visible on website</option>
                <option value="REJECTED">Hidden</option>
              </select>
            </div>

            {formError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <X className="h-4 w-4 shrink-0" />
                {formError}
              </p>
            )}

            <SheetFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Add Review'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
