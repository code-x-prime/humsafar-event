"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useOrderStatus } from "@/hooks/useOrderStatus";

interface OrderSummary {
  orderNumber: string;
  status: string;
  total: string;
  amountPaid: string;
  createdAt: string;
}

const PAID_STATUSES = ["CONFIRMED", "SHIPPED", "DELIVERED", "COMPLETED"];

export default function ShopOrderConfirmedPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { order, failed, settled } = useOrderStatus<OrderSummary>(`/shop/checkout/orders/${orderId}`);

  const isPaid = order ? PAID_STATUSES.includes(order.status) : false;
  const isWaiting = order?.status === "PENDING_PAYMENT";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-(--surface-alt,#F7F9FC)">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          {failed && (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--coral-100)">
                <XCircle className="h-9 w-9 text-(--coral-600)" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-semibold text-primary">We couldn&apos;t find this order</h1>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                If you just paid, don&apos;t worry — it will show up under your orders once the payment is confirmed.
              </p>
            </>
          )}

          {!failed && !order && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-(--ink-500)" />
              <p className="mt-4 font-sans text-sm text-(--ink-500)">Checking your order...</p>
            </>
          )}

          {isWaiting && !settled && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-(--orange-500)" />
              <h1 className="mt-5 font-display text-2xl font-semibold text-primary">Confirming your payment...</h1>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                Please don&apos;t close this page. This usually takes a few seconds.
              </p>
            </>
          )}

          {isWaiting && settled && (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--orange-50,#FFF4E8)">
                <Clock className="h-9 w-9 text-(--orange-600)" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-semibold text-primary">Payment not confirmed yet</h1>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                We haven&apos;t received confirmation for order #{order?.orderNumber} yet. If money was deducted, it will be
                confirmed automatically within a few minutes and you&apos;ll get an email. Otherwise you can try ordering again.
              </p>
            </>
          )}

          {order && (order.status === "CANCELLED" || order.status === "REFUNDED") && (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--coral-100)">
                <XCircle className="h-9 w-9 text-(--coral-600)" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-semibold text-primary">This order isn&apos;t active</h1>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                Order #{order.orderNumber} was {order.status === "REFUNDED" ? "refunded" : "cancelled"}.
              </p>
            </>
          )}

          {isPaid && order && (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--success,#15803D)/10">
                <CheckCircle2 className="h-9 w-9 text-(--success,#15803D)" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-semibold text-primary">Order Confirmed!</h1>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                Order #{order.orderNumber} — thanks for shopping with us.
              </p>

              <div className="mt-6 rounded-2xl border border-(--ink-100) bg-white p-5 text-left font-sans text-sm">
                <div className="flex justify-between">
                  <span className="text-(--ink-500)">Total</span>
                  <span className="font-semibold text-(--navy-800)">&#8377;{order.total}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-(--ink-500)">Paid</span>
                  <span className="font-semibold text-(--success,#15803D)">&#8377;{order.amountPaid}</span>
                </div>
              </div>

              <p className="mt-4 font-sans text-xs text-(--ink-500)">
                A confirmation email is on its way — we&apos;ll send tracking details as soon as it ships.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
            >
              Continue Shopping
            </Link>
            <Link
              href="/profile"
              className="rounded-full border border-(--ink-300) px-6 py-2.5 font-heading text-sm font-semibold text-(--navy-800)"
            >
              View My Orders
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
