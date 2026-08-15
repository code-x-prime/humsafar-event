"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getJson } from "@/lib/api";

interface OrderSummary {
  orderNumber: string;
  status: string;
  total: string;
  amountPaid: string;
  createdAt: string;
}

export default function ShopOrderConfirmedPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderSummary | null>(null);

  useEffect(() => {
    getJson<OrderSummary>(`/shop/checkout/orders/${orderId}`)
      .then(setOrder)
      .catch(() => {});
  }, [orderId]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-(--surface-alt,#F7F9FC)">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--success,#15803D)/10">
            <CheckCircle2 className="h-9 w-9 text-(--success,#15803D)" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-primary">Order Confirmed!</h1>
          <p className="mt-2 font-sans text-sm text-(--ink-500)">
            {order ? `Order #${order.orderNumber} — thanks for shopping with us.` : "Fetching your order details..."}
          </p>

          {order && (
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
          )}

          <p className="mt-4 font-sans text-xs text-(--ink-500)">
            A confirmation email is on its way — we&apos;ll send tracking details as soon as it ships.
          </p>

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
