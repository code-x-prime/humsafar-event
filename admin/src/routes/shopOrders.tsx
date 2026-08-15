import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Eye, X, Truck, RefreshCw } from 'lucide-react'

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
  awbCode: string | null
  courierName: string | null
  trackingUrl: string | null
  error: string | null
}

interface ShopOrder {
  id: string
  orderNumber: string
  status: string
  user: { id: string; name: string | null; email: string | null; phone: string | null }
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
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function money(v: string | number) {
  return `₹${Number(v).toLocaleString('en-IN')}`
}

export function ShopOrdersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ShopOrder | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['shop-orders', { statusFilter, search }],
    queryFn: () =>
      api.get<ShopOrder[]>(
        `/admin/shop-orders?limit=100${statusFilter ? `&status=${statusFilter}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`
      ),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.patch(`/admin/shop-orders/${id}/status`, { status, cancelReason: reason }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] })
      setSelected(res.data as ShopOrder)
      setCancelOpen(false)
      setCancelReason('')
      toast.success('Order status updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const pushMutation = useMutation({
    mutationFn: (orderId: string) => api.post(`/admin/shop-orders/${orderId}/shipment/push`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] })
      setSelected((prev) => (prev ? { ...prev, shipment: res.data as Shipment } : prev))
      toast.success('Order pushed to Shiprocket')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const assignMutation = useMutation({
    mutationFn: (shipmentId: string) => api.post(`/admin/shop-orders/shipments/${shipmentId}/assign`, {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] })
      setSelected((prev) => (prev ? { ...prev, shipment: res.data as Shipment, status: 'SHIPPED' } : prev))
      toast.success('Courier assigned — tracking email sent to customer')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const refreshMutation = useMutation({
    mutationFn: (shipmentId: string) => api.post(`/admin/shop-orders/shipments/${shipmentId}/refresh-tracking`, {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] })
      setSelected((prev) => (prev ? { ...prev, shipment: res.data as Shipment } : prev))
      toast.success('Tracking status refreshed')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const orders = data?.data ?? []

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Shop With Us — Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every Shop With Us order — products, payment, and Shiprocket shipment status.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          placeholder="Search order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
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
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Shipment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No shop orders yet.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.user?.name || order.user?.email || order.user?.phone || '—'}</TableCell>
                  <TableCell>{money(order.total)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status] || ''}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {order.shipment ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SHIPMENT_STATUS_STYLES[order.shipment.status] || ''}`}>
                        {order.shipment.status.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not shipped</span>
                    )}
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
                    {selected.user?.name || '—'} {selected.user?.email && <>&middot; {selected.user.email}</>}{' '}
                    {selected.user?.phone && <>&middot; {selected.user.phone}</>}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipping Address</p>
                  <p className="mt-1 text-sm">
                    {selected.addressSnapshot.fullName} &middot; {selected.addressSnapshot.phone}
                    <br />
                    {selected.addressSnapshot.line1}
                    {selected.addressSnapshot.line2 ? `, ${selected.addressSnapshot.line2}` : ''}
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
                      <p className="text-sm text-muted-foreground">Not yet pushed to Shiprocket.</p>
                      {selected.status !== 'PENDING_PAYMENT' && selected.status !== 'CANCELLED' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={pushMutation.isPending}
                          onClick={() => pushMutation.mutate(selected.id)}
                        >
                          {pushMutation.isPending ? 'Pushing...' : 'Push to Shiprocket'}
                        </Button>
                      )}
                    </div>
                  )}

                  {selected.shipment && (
                    <div className="mt-2 flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SHIPMENT_STATUS_STYLES[selected.shipment.status] || ''}`}>
                          {selected.shipment.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">{selected.shipment.mode === 'AUTO' ? 'Auto' : 'Manual'}</span>
                      </div>

                      {selected.shipment.error && (
                        <p className="text-xs text-destructive">{selected.shipment.error}</p>
                      )}

                      {selected.shipment.awbCode ? (
                        <>
                          <p>
                            <span className="text-muted-foreground">AWB:</span> {selected.shipment.awbCode}
                            {selected.shipment.courierName && <> &middot; {selected.shipment.courierName}</>}
                          </p>
                          {selected.shipment.trackingUrl && (
                            <a href={selected.shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                              Track shipment
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="self-start"
                            disabled={refreshMutation.isPending}
                            onClick={() => refreshMutation.mutate(selected.shipment!.id)}
                          >
                            <RefreshCw className="mr-1 h-3.5 w-3.5" />
                            {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Tracking'}
                          </Button>
                        </>
                      ) : (
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
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
                  <div className="mt-2 flex flex-col gap-3">
                    {selected.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-3">
                        <div className="flex items-center gap-3">
                          {item.productSnapshot?.image && (
                            <img src={item.productSnapshot.image} alt="" className="h-10 w-10 rounded object-cover" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.productSnapshot?.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">Qty: {item.qty}</p>
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
                        <span className="text-muted-foreground">Tax</span>
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
