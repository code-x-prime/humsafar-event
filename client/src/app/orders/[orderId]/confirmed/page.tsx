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
  amountDue: string;
  eventDate: string;
}

const PAID_STATUSES = ["CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"];

export default function OrderConfirmedPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { order, failed, settled } = useOrderStatus<OrderSummary>(`/checkout/orders/${orderId}`);

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
              <h1 className="mt-5 font-display text-2xl font-semibold text-primary">We couldn&apos;t find this booking</h1>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                If you just paid, don&apos;t worry — it will show up under your orders once the payment is confirmed.
              </p>
            </>
          )}

          {!failed && !order && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-(--ink-500)" />
              <p className="mt-4 font-sans text-sm text-(--ink-500)">Checking your booking...</p>
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
                We haven&apos;t received confirmation for booking #{order?.orderNumber} yet. If money was deducted, it will be
                confirmed automatically within a few minutes and you&apos;ll get an email. Otherwise you can try booking again.
              </p>
            </>
          )}

          {order && (order.status === "CANCELLED" || order.status === "REFUNDED") && (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--coral-100)">
                <XCircle className="h-9 w-9 text-(--coral-600)" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-semibold text-primary">This booking isn&apos;t active</h1>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                Booking #{order.orderNumber} was {order.status === "REFUNDED" ? "refunded" : "cancelled"}.
              </p>
            </>
          )}

          {isPaid && order && (
            <>
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--success,#15803D)/10">
                <CheckCircle2 className="h-9 w-9 text-(--success,#15803D)" />
              </span>
              <h1 className="mt-5 font-display text-2xl font-semibold text-primary">Booking Confirmed!</h1>
              <p className="mt-2 font-sans text-sm text-(--ink-500)">
                Booking #{order.orderNumber} — we&apos;ll see you on {order.eventDate}.
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
                {Number(order.amountDue) > 0 && (
                  <div className="mt-1 flex justify-between">
                    <span className="text-(--ink-500)">Due later</span>
                    <span className="font-semibold text-(--coral-600)">&#8377;{order.amountDue}</span>
                  </div>
                )}
              </div>

              <p className="mt-4 font-sans text-xs text-(--ink-500)">
                A confirmation email with full details is on its way to your inbox.
              </p>
            </>
          )}

          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
          >
            Back to Home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
