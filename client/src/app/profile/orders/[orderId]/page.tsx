"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, CreditCard, Star } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getJson, ApiError } from "@/lib/api";
import { WriteReviewDialog } from "@/components/WriteReviewDialog";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  eventDate: string;
  cityName: string;
  addressSnapshot: { fullName: string; phone: string; line1: string; line2: string | null; landmark: string | null; pincode: string };
  subtotal: string;
  addOnTotal: string;
  deliveryCharge: string;
  discount: string;
  couponCode: string | null;
  total: string;
  amountPaid: string;
  amountDue: string;
  paymentMode: string;
  items: {
    id: string;
    productId: string;
    title: string;
    variant: { name: string } | null;
    qty: number;
    subtotal: string;
    addOns: { name: string; price: string }[];
  }[];
  payments: { id: string; amount: string; status: string; method: string | null; createdAt: string }[];
}

interface ReviewableItem {
  orderId: string;
  productId: string;
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewable, setReviewable] = useState<ReviewableItem[]>([]);
  const [reviewTarget, setReviewTarget] = useState<{ productId: string; title: string } | null>(null);

  const loadReviewable = useCallback(() => {
    getJson<ReviewableItem[]>("/reviews/reviewable")
      .then(setReviewable)
      .catch(() => {});
  }, []);

  useEffect(() => {
    getJson<OrderDetail>(`/checkout/my-orders/${orderId}`)
      .then(setOrder)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this order"));
    loadReviewable();
  }, [orderId, loadReviewable]);

  function canReview(productId: string) {
    return reviewable.some((r) => r.orderId === orderId && r.productId === productId);
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
                <span className="rounded-full bg-primary/10 px-3 py-1 font-heading text-xs font-semibold text-primary">
                  {order.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 font-sans text-sm text-(--ink-500)">Event date: {order.eventDate}</p>

              <div className="mt-5 rounded-2xl border border-(--ink-100) bg-white p-5">
                <p className="font-heading text-sm font-semibold text-(--navy-800)">Items</p>
                <div className="mt-3 flex flex-col gap-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="border-b border-(--ink-100) pb-3 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-sans text-sm font-medium text-(--navy-800)">
                            {item.title}{item.variant ? ` — ${item.variant.name}` : ""}
                          </p>
                          <p className="font-sans text-xs text-(--ink-500)">Qty: {item.qty}</p>
                          {item.addOns.length > 0 && (
                            <p className="font-sans text-xs text-(--ink-500)">+ {item.addOns.map((a) => a.name).join(", ")}</p>
                          )}
                        </div>
                        <p className="font-heading text-sm font-semibold text-(--navy-800)">&#8377;{item.subtotal}</p>
                      </div>
                      {order.status === "COMPLETED" && canReview(item.productId) && (
                        <button
                          onClick={() => setReviewTarget({ productId: item.productId, title: item.title })}
                          className="mt-2 flex items-center gap-1.5 rounded-full border border-(--orange-500) px-3 py-1 font-heading text-xs font-semibold text-(--orange-600)"
                        >
                          <Star className="h-3.5 w-3.5" /> Write a Review
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-(--ink-100) bg-white p-5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-(--coral-600)" />
                  <p className="font-heading text-sm font-semibold text-(--navy-800)">Delivery Address</p>
                </div>
                <p className="mt-2 font-sans text-sm text-(--ink-700)">
                  {order.addressSnapshot.fullName} &middot; {order.addressSnapshot.phone}<br />
                  {order.addressSnapshot.line1}{order.addressSnapshot.line2 ? `, ${order.addressSnapshot.line2}` : ""}<br />
                  {order.cityName} — {order.addressSnapshot.pincode}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-(--ink-100) bg-white p-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-(--coral-600)" />
                  <p className="font-heading text-sm font-semibold text-(--navy-800)">Payment</p>
                </div>
                <div className="mt-3 flex flex-col gap-1.5 font-sans text-sm">
                  <div className="flex justify-between text-(--ink-700)"><span>Subtotal</span><span>&#8377;{order.subtotal}</span></div>
                  {Number(order.addOnTotal) > 0 && <div className="flex justify-between text-(--ink-500)"><span>Add-ons</span><span>+&#8377;{order.addOnTotal}</span></div>}
                  {Number(order.discount) > 0 && <div className="flex justify-between text-(--success,#15803D)"><span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span><span>-&#8377;{order.discount}</span></div>}
                  <div className="flex justify-between border-t border-(--ink-100) pt-2 font-heading font-semibold text-(--navy-800)"><span>Total</span><span>&#8377;{order.total}</span></div>
                  <div className="flex justify-between text-(--success,#15803D)"><span>Paid</span><span>&#8377;{order.amountPaid}</span></div>
                  {Number(order.amountDue) > 0 && <div className="flex justify-between text-(--coral-600)"><span>Due</span><span>&#8377;{order.amountDue}</span></div>}
                </div>
              </div>
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
        />
      )}

      <Footer />
    </div>
  );
}
