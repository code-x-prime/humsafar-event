import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Eye, X } from 'lucide-react'

interface OrderItem {
  id: string
  productSnapshot: { title: string; slug: string; price: string; variant: { name: string; swatches: string[] } | null; notes?: string | null }
  qty: number
  unitPrice: string
  subtotal: string
  addOnsSnapshot: { id: string; name: string; price: string; image?: string | null }[] | null
  product?: { shortDescription: string | null; media: { url: string; type: string }[] } | null
}

interface Payment {
  id: string
  amount: string
  status: string
  method: string | null
  razorpayPaymentId: string | null
  createdAt: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  eventDate: string
  timeSlot: { label: string; startTime: string; endTime: string } | null
  customerNote: string | null
  cityId: string
  city: { name: string }
  user: { id: string; name: string | null; email: string | null; phone: string | null }
  addressSnapshot: { fullName: string; phone: string; line1: string; line2: string | null; landmark: string | null; pincode: string; cityName: string }
  subtotal: string
  addOnTotal: string
  deliveryCharge: string
  surgeCharge: string
  discount: string
  couponCode: string | null
  taxAmount: string
  total: string
  amountPaid: string
  amountDue: string
  paymentMode: string
  cancelReason: string | null
  adminNote: string | null
  createdAt: string
  items: OrderItem[]
  payments: Payment[]
}

const STATUS_OPTIONS = ['PENDING_PAYMENT', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED']

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: 'bg-muted text-muted-foreground',
  CONFIRMED: 'bg-blue-500/10 text-blue-600',
  ASSIGNED: 'bg-blue-500/10 text-blue-600',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-600',
  COMPLETED: 'bg-green-500/10 text-green-600',
  CANCELLED: 'bg-destructive/10 text-destructive',
  REFUNDED: 'bg-destructive/10 text-destructive',
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || 'https://humsafarevent.com').replace(/\/$/, '')

function money(v: string | number) {
  return `₹${Number(v).toLocaleString('en-IN')}`
}

export function OrdersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchDraft.trim()), 400)
    return () => clearTimeout(t)
  }, [searchDraft])

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { statusFilter, search }],
    queryFn: () =>
      api.get<Order[]>(
        `/admin/orders?limit=100${statusFilter ? `&status=${statusFilter}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      ),
    placeholderData: keepPreviousData,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.patch(`/admin/orders/${id}/status`, { status, cancelReason: reason }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setSelected(res.data as Order)
      setCancelOpen(false)
      setCancelReason('')
      toast.success('Order status updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const orders = data?.data ?? []

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every booking — products, colors, add-ons, coupon, and payment status.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search order #, name, phone, email, pincode…"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  No orders yet.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.user?.name || order.user?.email || order.user?.phone || '—'}</TableCell>
                  <TableCell>{order.city?.name}</TableCell>
                  <TableCell>
                    <div>{order.eventDate?.slice(0, 10)}</div>
                    <div className="text-xs text-muted-foreground">{order.timeSlot ? order.timeSlot.label : 'No slot'}</div>
                  </TableCell>
                  <TableCell>{money(order.total)}</TableCell>
                  <TableCell>{money(order.amountPaid)}</TableCell>
                  <TableCell className={order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELLED' && Number(order.amountDue) > 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                    {order.status === 'PENDING_PAYMENT' || order.status === 'CANCELLED' ? '—' : money(order.amountDue)}
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status] || ''}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(order)} title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Order detail */}
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.orderNumber}</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-5 px-4 pb-6">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[selected.status] || ''}`}>
                    {selected.status.replace('_', ' ')}
                  </span>
                  <select
                    value={selected.status}
                    onChange={(e) => {
                      const next = e.target.value
                      if (next === 'CANCELLED') {
                        setCancelOpen(true)
                      } else {
                        statusMutation.mutate({ id: selected.id, status: next })
                      }
                    }}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {cancelOpen && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <Label htmlFor="cancel-reason" className="text-xs">
                      Cancellation reason (emailed to customer)
                    </Label>
                    <Textarea
                      id="cancel-reason"
                      rows={2}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="mt-1"
                      placeholder="e.g. Decorator unavailable for this date"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setCancelOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!cancelReason.trim() || statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: selected.id, status: 'CANCELLED', reason: cancelReason.trim() })}
                      >
                        Confirm Cancel &amp; Email Customer
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
                  <p className="mt-1 text-sm">
                    {selected.user?.name || '—'} {selected.user?.email && <>&middot; {selected.user.email}</>}{' '}
                    {selected.user?.phone && <>&middot; {selected.user.phone}</>}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery Address</p>
                  <p className="mt-1 text-sm">
                    {selected.addressSnapshot.fullName} &middot; {selected.addressSnapshot.phone}
                    <br />
                    {selected.addressSnapshot.line1}
                    {selected.addressSnapshot.line2 ? `, ${selected.addressSnapshot.line2}` : ''}
                    <br />
                    {selected.addressSnapshot.cityName} — {selected.addressSnapshot.pincode}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event</p>
                  <p className="mt-1 text-sm">
                    {selected.eventDate?.slice(0, 10)} &middot; {selected.city?.name}
                    <br />
                    {selected.timeSlot ? (
                      <>
                        {selected.timeSlot.label} ({selected.timeSlot.startTime} – {selected.timeSlot.endTime})
                      </>
                    ) : (
                      <span className="text-muted-foreground">No time slot — confirm the timing with the customer</span>
                    )}
                  </p>
                </div>

                {selected.customerNote && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer Note</p>
                    <p className="mt-1 text-sm">{selected.customerNote}</p>
                  </div>
                )}

                {selected.cancelReason && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Cancellation Reason</p>
                    <p className="mt-1 text-sm">{selected.cancelReason}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
                  <div className="mt-2 flex flex-col gap-3">
                    {selected.items.map((item) => (
                      <div key={item.id} className="rounded-md border border-border p-3">
                        <div className="flex items-start justify-between gap-3">
                          {(() => {
                            const img = item.product?.media?.find((m) => m.type === 'IMAGE') ?? item.product?.media?.[0]
                            return img ? (
                              <a href={img.url} target="_blank" rel="noreferrer" title="Open full image">
                                <img src={img.url} alt={item.productSnapshot?.title} className="h-20 w-20 shrink-0 rounded-md border border-border object-cover" />
                              </a>
                            ) : null
                          })()}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{item.productSnapshot?.title}</p>
                            {item.product?.shortDescription && (
                              <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{item.product.shortDescription}</p>
                            )}
                            {item.productSnapshot?.slug && (
                              <a
                                href={`${SITE_URL}/decoration/${item.productSnapshot.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block text-xs font-medium text-primary underline"
                              >
                                View product page ↗
                              </a>
                            )}
                            {(item.product?.media?.filter((m) => m.type === 'IMAGE').length ?? 0) > 1 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.product!.media.filter((m) => m.type === 'IMAGE').slice(1).map((m) => (
                                  <a key={m.url} href={m.url} target="_blank" rel="noreferrer" title="Open full image">
                                    <img src={m.url} alt="" className="h-10 w-10 rounded border border-border object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}
                            {item.productSnapshot?.variant && (
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                Color:
                                {item.productSnapshot.variant.swatches?.length > 0 && (
                                  <span className="flex overflow-hidden rounded-full border border-border">
                                    {item.productSnapshot.variant.swatches.slice(0, 2).map((c, i) => (
                                      <span key={i} className="h-3 w-3" style={{ backgroundColor: c }} />
                                    ))}
                                  </span>
                                )}
                                {item.productSnapshot.variant.name}
                              </p>
                            )}
                            {item.productSnapshot?.notes && (
                              <p className="mt-0.5 text-xs font-medium text-primary">{item.productSnapshot.notes}</p>
                            )}
                            <p className="mt-0.5 text-xs text-muted-foreground">Qty: {item.qty}</p>
                          </div>
                          <p className="text-sm font-semibold">
                            {money(
                              Number(item.subtotal) -
                                (item.addOnsSnapshot || []).reduce((s, a) => s + Number(a.price), 0) * item.qty
                            )}
                          </p>
                        </div>
                        {item.addOnsSnapshot && item.addOnsSnapshot.length > 0 && (
                          <div className="mt-2 border-t border-border pt-2">
                            <p className="text-xs font-semibold text-muted-foreground">Add-ons</p>
                            <ul className="mt-1 flex flex-col gap-0.5">
                              {item.addOnsSnapshot.map((a) => (
                                <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="flex items-center gap-2">
                                    {a.image && (
                                      <a href={a.image} target="_blank" rel="noreferrer" title="Open full image">
                                        <img src={a.image} alt={a.name} className="h-10 w-10 rounded border border-border object-cover" />
                                      </a>
                                    )}
                                    <span>
                                      + {a.name}
                                      {item.qty > 1 ? ` × ${item.qty}` : ''}
                                    </span>
                                  </span>
                                  <span>{money(Number(a.price) * item.qty)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing</p>
                  <div className="mt-2 flex flex-col gap-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{money(Number(selected.subtotal) - Number(selected.addOnTotal || 0))}</span>
                    </div>
                    {Number(selected.addOnTotal) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Add-ons</span>
                        <span>+{money(selected.addOnTotal)}</span>
                      </div>
                    )}
                    {Number(selected.deliveryCharge) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery</span>
                        <span>+{money(selected.deliveryCharge)}</span>
                      </div>
                    )}
                    {Number(selected.surgeCharge) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Surge</span>
                        <span>+{money(selected.surgeCharge)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Coupon {selected.couponCode ? `(${selected.couponCode})` : ''}
                      </span>
                      <span className={Number(selected.discount) > 0 ? 'text-green-600' : ''}>
                        {selected.couponCode ? `-${money(selected.discount)}` : 'Not applied'}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
                      <span>Total</span>
                      <span>{money(selected.total)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Paid</span>
                      <span>{money(selected.amountPaid)}</span>
                    </div>
                    {Number(selected.amountDue) > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Due</span>
                        <span>{money(selected.amountDue)}</span>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Payment mode: {selected.paymentMode === 'ADVANCE' ? 'Advance (balance due after setup)' : 'Full amount'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payment{selected.payments.length !== 1 ? 's' : ''}
                  </p>
                  {selected.payments.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">No payment attempts yet — Razorpay may not be configured.</p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      {selected.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                          <div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                p.status === 'PAID'
                                  ? 'bg-green-500/10 text-green-600'
                                  : p.status === 'FAILED'
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {p.status}
                            </span>
                            {p.method && <span className="ml-2 text-xs text-muted-foreground">{p.method}</span>}
                          </div>
                          <span className="font-medium">{money(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <SheetFooter>
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  <X className="mr-1 h-4 w-4" /> Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
