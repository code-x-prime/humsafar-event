import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, Check, X, Trash2, Reply } from 'lucide-react'

interface ShopReview {
  id: string
  rating: number
  title: string | null
  comment: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  adminReply: string | null
  isFeatured: boolean
  createdAt: string
  product: { id: string; title: string }
  user: { id: string; name: string | null }
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600',
  APPROVED: 'bg-green-500/10 text-green-600',
  REJECTED: 'bg-destructive/10 text-destructive',
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

export function ShopReviewsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['shop-reviews', { statusFilter }],
    queryFn: () => api.get<ShopReview[]>(`/admin/shop-reviews?limit=100${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}`),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => api.patch(`/admin/shop-reviews/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-reviews'] })
      setReplyingId(null)
      setReplyText('')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/shop-reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-reviews'] })
      toast.success('Review deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const reviews = data?.data ?? []

  function approve(id: string) {
    updateMutation.mutate({ id, payload: { status: 'APPROVED' } })
    toast.success('Review approved')
  }

  function reject(id: string) {
    updateMutation.mutate({ id, payload: { status: 'REJECTED' } })
    toast.success('Review rejected')
  }

  function submitReply(id: string) {
    updateMutation.mutate({ id, payload: { adminReply: replyText } })
    toast.success('Reply saved')
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Shop Reviews</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Customer reviews from delivered Shop With Us orders — approve to show on the product page, reject to hide, or reply publicly.
      </p>

      <div className="mt-4 flex gap-1 rounded-md border border-border p-1 w-fit">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              statusFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-md" />)}

        {!isLoading && reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">No reviews here.</p>
        )}

        {!isLoading &&
          reviews.map((review) => (
            <div key={review.id} className="rounded-md border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                      ))}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[review.status]}`}>{review.status}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium">{review.product.title}</p>
                  <p className="text-xs text-muted-foreground">by {review.user.name || 'Customer'} &middot; {new Date(review.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="flex gap-1">
                  {review.status !== 'APPROVED' && (
                    <Button variant="ghost" size="sm" onClick={() => approve(review.id)} title="Approve">
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  {review.status !== 'REJECTED' && (
                    <Button variant="ghost" size="sm" onClick={() => reject(review.id)} title="Reject">
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => { setReplyingId(review.id); setReplyText(review.adminReply || '') }} title="Reply">
                    <Reply className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(review.id)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {review.title && <p className="mt-2 text-sm font-semibold">{review.title}</p>}
              {review.comment && <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>}

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
                    <Button size="sm" onClick={() => submitReply(review.id)} disabled={!replyText.trim()}>
                      Save Reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
