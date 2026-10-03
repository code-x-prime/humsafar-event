import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { openDocument } from '@/lib/openDocument'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Eye, X, Truck, RefreshCw, Download, FileText, AlertCircle } from 'lucide-react'

interface OrderItem {
  id: string
  productSnapshot: { title: string; slug: string; price: string; image: string | null }
  qty: number
  unitPrice: string
  subtotal: string
}

interface Payment {
  id: string
  amount: string
  status: string
  method: string | null
  razorpayPaymentId: string | null
  createdAt: string
}

interface Shipment {
  id: string
  mode: 'AUTO' | 'MANUAL'
  status: string
  shipmentId: string | null
  awbCode: string | null
  courierName: string | null
  trackingUrl: string | null
  pickupScheduledAt: string | null
  deliveredAt: string | null
  lastTrackedAt: string | null
  error: string | null
}

interface ShopOrder {
  id: string
  orderNumber: string
  status: string
  user: { id: string; name: string | null; email: string | null; phone: string | null } | null
  addressSnapshot: { fullName: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; state: string; pincode: string }
  subtotal: string
  shippingCharge: string
  taxAmount: string
  total: string
  amountPaid: string
  cancelReason: string | null
  adminNote: string | null
  createdAt: string
  items: OrderItem[]
  payments: Payment[]
  shipment: Shipment | null
}

interface OrderCounts {
  all: number
  byStatus: Record<string, number>
  shipmentIssues: number
}

// Tabs are named for what the admin has to do next, not the raw status.
const TABS = [
  { value: '', label: 'All' },
  { value: 'CONFIRMED', label: 'To ship' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'PENDING_PAYMENT', label: 'Unpaid' },
] as const

const STATUS_OPTIONS = ['PENDING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: 'bg-muted text-muted-foreground',
  CONFIRMED: 'bg-blue-500/10 text-blue-600',
  SHIPPED: 'bg-amber-500/10 text-amber-600',
  DELIVERED: 'bg-green-500/10 text-green-600',
  CANCELLED: 'bg-destructive/10 text-destructive',
  REFUNDED: 'bg-destructive/10 text-destructive',
}

const SHIPMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  AWB_ASSIGNED: 'bg-blue-500/10 text-blue-600',
  PICKUP_SCHEDULED: 'bg-blue-500/10 text-blue-600',
  IN_TRANSIT: 'bg-amber-500/10 text-amber-600',
  OUT_FOR_DELIVERY: 'bg-amber-500/10 text-amber-600',
  DELIVERED: 'bg-green-500/10 text-green-600',
  RTO: 'bg-destructive/10 text-destructive',
  CANCELLED: 'bg-destructive/10 text-destructive',
  FAILED: 'bg-destructive/10 text-destructive',
}

function errorMessage(err: unknown) {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
}

function money(v: string | number) {
  return `₹${Number(v).toLocaleString('en-IN')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

function label(status: string) {
  return status.replace(/_/g, ' ')
}

export function ShopOrdersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ShopOrder | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchDraft.trim()), 400)
    return () => clearTimeout(t)
  }, [searchDraft])

  const { data, isLoading } = useQuery({
    queryKey: ['shop-orders', { statusFilter, search }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      return api.get<ShopOrder[]>(`/admin/shop-orders?${params.toString()}`)
    },
    placeholderData: keepPreviousData,
  })

  const { data: countsData } = useQuery({
    queryKey: ['shop-orders', 'counts'],
    queryFn: () => api.get<OrderCounts>('/admin/shop-orders/counts'),
  })
  const counts = countsData?.data

  // After anything changes, refresh the list, the tab counts and the open order.
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['shop-orders'] })
  const updateShipment = (shipment: Shipment) => setSelected((prev) => (prev ? { ...prev, shipment } : prev))

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.patch(`/admin/shop-orders/${id}/status`, { status, cancelReason: reason }),
    onSuccess: (res) => {
      refresh()
      setSelected(res.data as ShopOrder)
      setCancelOpen(false)
      setCancelReason('')
      toast.success('Order status updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const pushMutation = useMutation({
    mutationFn: (orderId: string) => api.post<Shipment>(`/admin/shop-orders/${orderId}/shipment/push`),
    onSuccess: (res) => {
      refresh()
      updateShipment(res.data)
      if (res.data.status === 'FAILED') toast.error(res.data.error || 'Shiprocket did not accept this order')
      else toast.success('Order sent to Shiprocket')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const assignMutation = useMutation({
    mutationFn: (shipmentId: string) => api.post<Shipment>(`/admin/shop-orders/shipments/${shipmentId}/assign`, {}),
    onSuccess: (res) => {
      refresh()
      setSelected((prev) => (prev ? { ...prev, shipment: res.data, status: 'SHIPPED' } : prev))
      toast.success('Courier assigned — tracking email sent to the customer')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const pickupMutation = useMutation({
    mutationFn: (shipmentId: string) => api.post<Shipment>(`/admin/shop-orders/shipments/${shipmentId}/pickup`, {}),
    onSuccess: (res) => {
      refresh()
      updateShipment(res.data)
      toast.success('Pickup requested')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const refreshMutation = useMutation({
    mutationFn: (shipmentId: string) => api.post<Shipment>(`/admin/shop-orders/shipments/${shipmentId}/refresh-tracking`, {}),
    onSuccess: (res) => {
      refresh()
      updateShipment(res.data)
      toast.success('Tracking refreshed')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  async function downloadLabel(shipmentId: string) {
    try {
      await openDocument(async () => {
        const res = await api.post<{ url: string }>(`/admin/shop-orders/shipments/${shipmentId}/label`, {})
        return { url: res.data.url }
      })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function openInvoice(orderId: string) {
    try {
      await openDocument(async () => {
        const res = await api.get<{ html: string }>(`/admin/shop-orders/${orderId}/invoice`)
        return { html: res.data.html }
      })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const orders = data?.data ?? []

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Shop With Us — Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every Shop With Us order — customer, payment, shipping label, tracking and invoice in one place.
      </p>

      {counts && counts.shipmentIssues > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {counts.shipmentIssues} paid order{counts.shipmentIssues === 1 ? '' : 's'} could not be sent to Shiprocket. Open the order marked
            &quot;FAILED&quot; and press <strong>Retry</strong> (check Settings → Shipping if it keeps failing).
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex w-fit flex-wrap gap-1 rounded-md border border-border p-1">
          {TABS.map((tab) => {
            const count = tab.value === '' ? counts?.all : counts?.byStatus[tab.value]
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === tab.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      tab.value === 'CONFIRMED'
                        ? 'bg-amber-500 text-white'
                        : statusFilter === tab.value
                          ? 'bg-primary-foreground/20'
                          : 'bg-secondary'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <Input
          placeholder="Search order #, name, phone, email, AWB, pincode…"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Deliver to</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Shipment</TableHead>
              <TableHead className="text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No orders here.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelected(order)}>
                  <TableCell>
                    <div className="font-medium">{order.orderNumber}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.addressSnapshot?.fullName || order.user?.name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{order.addressSnapshot?.phone || order.user?.phone || order.user?.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.addressSnapshot?.city}
                    <div className="text-xs text-muted-foreground">
                      {order.addressSnapshot?.state} · {order.addressSnapshot?.pincode}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px] text-sm">
                    <div className="truncate">{order.items[0]?.productSnapshot?.title}</div>
                    {order.items.length > 1 && <div className="text-xs text-muted-foreground">+ {order.items.length - 1} more</div>}
                  </TableCell>
                  <TableCell>{money(order.total)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status] || ''}`}>{label(order.status)}</span>
                  </TableCell>
                  <TableCell>
                    {order.shipment ? (
                      <>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SHIPMENT_STATUS_STYLES[order.shipment.status] || ''}`}>
                          {label(order.shipment.status)}
                        </span>
                        {order.shipment.awbCode && <div className="mt-0.5 text-xs text-muted-foreground">{order.shipment.awbCode}</div>}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not shipped</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected(order)
                      }}
                      title="View"
                    >
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[selected.status] || ''}`}>{label(selected.status)}</span>
                  <div className="flex items-center gap-2">
                    {Number(selected.amountPaid) > 0 && (
                      <Button size="sm" variant="outline" onClick={() => openInvoice(selected.id)}>
                        <FileText className="mr-1 h-3.5 w-3.5" /> Invoice
                      </Button>
                    )}
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
                          {label(s)}
                        </option>
                      ))}
                    </select>
                  </div>
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
                      placeholder="e.g. Item out of stock"
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
                    {selected.user?.name || selected.addressSnapshot.fullName}
                    {selected.user?.email && (
                      <>
                        {' '}
                        &middot;{' '}
                        <a href={`mailto:${selected.user.email}`} className="text-primary underline">
                          {selected.user.email}
                        </a>
                      </>
                    )}
                    {selected.user?.phone && (
                      <>
                        {' '}
                        &middot;{' '}
                        <a href={`tel:${selected.user.phone}`} className="text-primary underline">
                          {selected.user.phone}
                        </a>
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipping Address</p>
                  <p className="mt-1 text-sm">
                    {selected.addressSnapshot.fullName} &middot;{' '}
                    <a href={`tel:${selected.addressSnapshot.phone}`} className="text-primary underline">
                      {selected.addressSnapshot.phone}
                    </a>
                    <br />
                    {selected.addressSnapshot.line1}
                    {selected.addressSnapshot.line2 ? `, ${selected.addressSnapshot.line2}` : ''}
                    {selected.addressSnapshot.landmark ? ` (${selected.addressSnapshot.landmark})` : ''}
                    <br />
                    {selected.addressSnapshot.city}, {selected.addressSnapshot.state} — {selected.addressSnapshot.pincode}
                  </p>
                </div>

                {selected.cancelReason && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Cancellation Reason</p>
                    <p className="mt-1 text-sm">{selected.cancelReason}</p>
                  </div>
                )}

                {/* Shipment */}
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Truck className="h-3.5 w-3.5" /> Shipment
                  </p>

                  {!selected.shipment && (
                    <div className="mt-2 flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">Not yet sent to Shiprocket.</p>
                      {selected.status !== 'PENDING_PAYMENT' && selected.status !== 'CANCELLED' && (
                        <Button size="sm" variant="secondary" className="self-start" disabled={pushMutation.isPending} onClick={() => pushMutation.mutate(selected.id)}>
                          {pushMutation.isPending ? 'Sending...' : 'Send to Shiprocket'}
                        </Button>
                      )}
                    </div>
                  )}

                  {selected.shipment && (
                    <div className="mt-2 flex flex-col gap-2.5 rounded-md border border-border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SHIPMENT_STATUS_STYLES[selected.shipment.status] || ''}`}>
                          {label(selected.shipment.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">{selected.shipment.mode === 'AUTO' ? 'Auto' : 'Manual'}</span>
                      </div>

                      {selected.shipment.error && <p className="text-xs text-destructive">{selected.shipment.error}</p>}

                      {/* 1. Never reached Shiprocket (or failed) → retry */}
                      {!selected.shipment.shipmentId && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="self-start"
                          disabled={pushMutation.isPending || selected.status === 'CANCELLED'}
                          onClick={() => pushMutation.mutate(selected.id)}
                        >
                          <RefreshCw className="mr-1 h-3.5 w-3.5" />
                          {pushMutation.isPending ? 'Retrying...' : 'Retry sending to Shiprocket'}
                        </Button>
                      )}

                      {/* 2. In Shiprocket but no courier yet → assign */}
                      {selected.shipment.shipmentId && !selected.shipment.awbCode && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="self-start"
                          disabled={assignMutation.isPending}
                          onClick={() => assignMutation.mutate(selected.shipment!.id)}
                        >
                          {assignMutation.isPending ? 'Assigning...' : 'Assign Courier & Get Tracking'}
                        </Button>
                      )}

                      {/* 3. Courier assigned → label, pickup, tracking */}
                      {selected.shipment.awbCode && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Tracking (AWB):</span>{' '}
                            <span className="font-semibold">{selected.shipment.awbCode}</span>
                            {selected.shipment.courierName && <> &middot; {selected.shipment.courierName}</>}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => downloadLabel(selected.shipment!.id)}>
                              <Download className="mr-1 h-3.5 w-3.5" /> Download Label
                            </Button>
                            {selected.shipment.trackingUrl && (
                              <a
                                href={selected.shipment.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                              >
                                Track shipment
                              </a>
                            )}
                            <Button size="sm" variant="ghost" disabled={refreshMutation.isPending} onClick={() => refreshMutation.mutate(selected.shipment!.id)}>
                              <RefreshCw className="mr-1 h-3.5 w-3.5" />
                              {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Tracking'}
                            </Button>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {selected.shipment.pickupScheduledAt ? (
                              <>Pickup requested for {formatDateTime(selected.shipment.pickupScheduledAt)}</>
                            ) : (
                              <span className="flex flex-wrap items-center gap-2">
                                Pickup not requested yet
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={pickupMutation.isPending}
                                  onClick={() => pickupMutation.mutate(selected.shipment!.id)}
                                >
                                  {pickupMutation.isPending ? 'Requesting...' : 'Request Pickup'}
                                </Button>
                              </span>
                            )}
                            {selected.shipment.deliveredAt && <div>Delivered on {formatDateTime(selected.shipment.deliveredAt)}</div>}
                            {selected.shipment.lastTrackedAt && <div>Last checked {formatDateTime(selected.shipment.lastTrackedAt)}</div>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
                  <div className="mt-2 flex flex-col gap-3">
                    {selected.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3">
                        <div className="flex items-center gap-3">
                          {item.productSnapshot?.image && <img src={item.productSnapshot.image} alt="" className="h-10 w-10 rounded object-cover" />}
                          <div>
                            <p className="text-sm font-medium">{item.productSnapshot?.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Qty: {item.qty} × {money(item.unitPrice)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold">{money(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing</p>
                  <div className="mt-2 flex flex-col gap-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{money(selected.subtotal)}</span>
                    </div>
                    {Number(selected.taxAmount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tax / GST
                          {Number(selected.subtotal) > 0 && ` (${Math.round((Number(selected.taxAmount) / Number(selected.subtotal)) * 10000) / 100}%)`}
                        </span>
                        <span>+{money(selected.taxAmount)}</span>
                      </div>
                    )}
                    {Number(selected.shippingCharge) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>+{money(selected.shippingCharge)}</span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
                      <span>Total</span>
                      <span>{money(selected.total)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Paid</span>
                      <span>{money(selected.amountPaid)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment{selected.payments.length !== 1 ? 's' : ''}</p>
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
                            {p.razorpayPaymentId && <div className="mt-0.5 text-[11px] text-muted-foreground">{p.razorpayPaymentId}</div>}
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
