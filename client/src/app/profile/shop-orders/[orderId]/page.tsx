"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, MapPin, CreditCard, Star, Truck, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getJson, postJson, ApiError } from "@/lib/api";
import { WriteReviewDialog } from "@/components/WriteReviewDialog";

interface ShopOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  addressSnapshot: { fullName: string; phone: string; line1: string; line2: string | null; landmark: string | null; city: string; state: string; pincode: string };
  subtotal: string;
  shippingCharge: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  items: { id: string; productId: string; productSlug: string; title: string; image: string | null; qty: number; subtotal: string }[];
  payments: { id: string; amount: string; status: string; method: string | null; createdAt: string }[];
  shipment: {
    status: string;
    awbCode: string | null;
    courierName: string | null;
    trackingUrl: string | null;
    pickupScheduledAt: string | null;
    deliveredAt: string | null;
  } | null;
}

interface ReviewableItem {
  orderId: string;
  productId: string;
}

const SHOP_STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-(--surface-alt,#F7F9FC) text-(--ink-500)",
  CONFIRMED: "bg-(--blue-600)/10 text-(--blue-600)",
  SHIPPED: "bg-(--orange-600)/10 text-(--orange-600)",
  DELIVERED: "bg-(--success,#15803D)/10 text-(--success,#15803D)",
  CANCELLED: "bg-(--coral-600)/10 text-(--coral-600)",
  REFUNDED: "bg-(--coral-600)/10 text-(--coral-600)",
};

export default function ShopOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<ShopOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewable, setReviewable] = useState<ReviewableItem[]>([]);
  const [reviewTarget, setReviewTarget] = useState<{ productId: string; title: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadReviewable = useCallback(() => {
    getJson<ReviewableItem[]>("/shop/reviews/reviewable")
      .then(setReviewable)
      .catch(() => {});
  }, []);

  const loadOrder = useCallback(() => {
    getJson<ShopOrderDetail>(`/shop/checkout/my-orders/${orderId}`)
      .then(setOrder)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this order"));
  }, [orderId]);

  useEffect(() => {
    loadOrder();
    loadReviewable();
  }, [loadOrder, loadReviewable]);

  function canReview(productId: string) {
    return reviewable.some((r) => r.orderId === orderId && r.productId === productId);
  }

  const canCancel = order && ["PENDING_PAYMENT", "CONFIRMED", "SHIPPED"].includes(order.status);

  async function handleCancel() {
    if (!cancelReason.trim()) {
      setCancelError("Please tell us why you want to cancel this order.");
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      await postJson(`/shop/checkout/orders/${orderId}/cancel-paid`, { reason: cancelReason.trim() });
      setShowCancelForm(false);
      setCancelReason("");
      loadOrder();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel this order. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-(--surface-alt,#F7F9FC)">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
          <button onClick={() => router.push("/profile")} className="flex items-center gap-2 font-sans text-sm text-(--ink-700)">
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </button>

          {error && <p className="mt-6 font-sans text-sm text-(--coral-600)">{error}</p>}

          {order && (
            <>
              <div className="mt-4 flex items-center justify-between">
                <h1 className="font-display text-xl font-semibold text-primary">{order.orderNumber}</h1>
                <span className={`rounded-full px-3 py-1 font-heading text-xs font-semibold ${SHOP_STATUS_STYLES[order.status] || "bg-primary/10 text-primary"}`}>
                  {order.status.replace("_", " ")}
                </span>
              </div>

              {order.shipment && (
                <div className="mt-4 rounded-2xl border border-(--ink-100) bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-(--coral-600)" />
                    <p className="font-heading text-sm font-semibold text-(--navy-800)">Shipment</p>
                  </div>
                  {order.shipment.awbCode ? (
                    <div className="mt-2 font-sans text-sm text-(--ink-700)">
                      <p>
                        AWB: <span className="font-semibold">{order.shipment.awbCode}</span>
                        {order.shipment.courierName && <> &middot; {order.shipment.courierName}</>}
                      </p>
                      {order.shipment.trackingUrl && (
                        <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-accent underline">
                          Track your package
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 font-sans text-sm text-(--ink-500)">Preparing your order for shipment.</p>
                  )}
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-(--ink-100) bg-white p-5">
                <p className="font-heading text-sm font-semibold text-(--navy-800)">Items</p>
                <div className="mt-3 flex flex-col gap-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="border-b border-(--ink-100) pb-3 last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        {item.image && (
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-(--surface-alt,#F7F9FC)">
                            <Image src={item.image} alt={item.title} fill quality={90} sizes="48px" className="object-cover" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-sans text-sm font-medium text-(--navy-800)">{item.title}</p>
                              <p className="font-sans text-xs text-(--ink-500)">Qty: {item.qty}</p>
                            </div>
                            <p className="font-heading text-sm font-semibold text-(--navy-800)">&#8377;{item.subtotal}</p>
                          </div>
                          {order.status === "DELIVERED" && canReview(item.productId) && (
                            <button
                              onClick={() => setReviewTarget({ productId: item.productId, title: item.title })}
                              className="mt-2 flex items-center gap-1.5 rounded-full border border-(--orange-500) px-3 py-1 font-heading text-xs font-semibold text-(--orange-600)"
                            >
                              <Star className="h-3.5 w-3.5" /> Write a Review
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-(--ink-100) bg-white p-5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-(--coral-600)" />
                  <p className="font-heading text-sm font-semibold text-(--navy-800)">Shipping Address</p>
                </div>
                <p className="mt-2 font-sans text-sm text-(--ink-700)">
                  {order.addressSnapshot.fullName} &middot; {order.addressSnapshot.phone}<br />
                  {order.addressSnapshot.line1}{order.addressSnapshot.line2 ? `, ${order.addressSnapshot.line2}` : ""}<br />
                  {order.addressSnapshot.city}, {order.addressSnapshot.state} — {order.addressSnapshot.pincode}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-(--ink-100) bg-white p-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-(--coral-600)" />
                  <p className="font-heading text-sm font-semibold text-(--navy-800)">Payment</p>
                </div>
                <div className="mt-3 flex flex-col gap-1.5 font-sans text-sm">
                  <div className="flex justify-between text-(--ink-700)"><span>Subtotal</span><span>&#8377;{order.subtotal}</span></div>
                  {Number(order.taxAmount) > 0 && <div className="flex justify-between text-(--ink-500)"><span>Tax</span><span>+&#8377;{order.taxAmount}</span></div>}
                  {Number(order.shippingCharge) > 0 && <div className="flex justify-between text-(--ink-500)"><span>Shipping</span><span>+&#8377;{order.shippingCharge}</span></div>}
                  <div className="flex justify-between border-t border-(--ink-100) pt-2 font-heading font-semibold text-(--navy-800)"><span>Total</span><span>&#8377;{order.total}</span></div>
                  <div className="flex justify-between text-(--success,#15803D)"><span>Paid</span><span>&#8377;{order.amountPaid}</span></div>
                </div>
              </div>

              {order.status === "CANCELLED" && (
                <div className="mt-4 rounded-2xl border border-(--coral-600)/30 bg-(--coral-600)/5 p-5">
                  <p className="font-heading text-sm font-semibold text-(--coral-600)">This order was cancelled.</p>
                </div>
              )}

              {canCancel && (
                <div className="mt-4 rounded-2xl border border-(--ink-100) bg-white p-5">
                  {!showCancelForm ? (
                    <button
                      onClick={() => setShowCancelForm(true)}
                      className="flex items-center gap-1.5 font-heading text-sm font-semibold text-(--coral-600)"
                    >
                      <XCircle className="h-4 w-4" /> Cancel This Order
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="font-heading text-sm font-semibold text-(--navy-800)">Why do you want to cancel?</p>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={3}
                        placeholder="e.g. Ordered by mistake, found it cheaper elsewhere..."
                        className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                      />
                      {cancelError && <p className="font-sans text-xs text-(--coral-600)">{cancelError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowCancelForm(false);
                            setCancelError(null);
                          }}
                          className="flex-1 rounded-full border border-(--ink-300) py-2 font-heading text-sm font-semibold text-(--ink-700)"
                        >
                          Keep Order
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={cancelling}
                          className="flex-1 rounded-full bg-(--coral-600) py-2 font-heading text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {reviewTarget && order && (
        <WriteReviewDialog
          orderId={order.id}
          productId={reviewTarget.productId}
          productTitle={reviewTarget.title}
          open={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={loadReviewable}
          endpoint="/shop/reviews"
        />
      )}

      <Footer />
    </div>
  );
}
