"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { CheckoutSection } from "@/components/CheckoutSection";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export default function CartPage() {
  const router = useRouter();
  const { cart, subtotal, loading, updateQty, removeItem } = useCart();
  const items = cart?.items ?? [];

  return (
    <div className="min-h-screen bg-(--surface-alt,#F7F9FC)">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-full bg-white p-2 text-(--ink-700) shadow-sm hover:text-accent"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-semibold text-primary sm:text-2xl">My Cart</h1>
            <p className="font-sans text-xs text-(--ink-500)">
              {items.length} item{items.length === 1 ? "" : "s"} &middot; &#8377;{subtotal.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
            {loading && (
              <div className="rounded-2xl border border-(--ink-100) bg-white p-6 text-center font-sans text-sm text-(--ink-500)">
                Loading your cart...
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-(--ink-100) bg-white p-10 text-center">
                <p className="font-sans text-sm text-(--ink-500)">Your cart is empty.</p>
                <Link
                  href="/"
                  className="rounded-full bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
                >
                  Browse Decorations
                </Link>
              </div>
            )}

            {!loading &&
              items.map((item) => {
                const addOnTotal = item.addOns.reduce((sum, a) => sum + Number(a.price), 0);
                const lineTotal = (Number(item.product.price) + addOnTotal) * item.qty;

                return (
                  <div key={item.id} className="rounded-2xl border border-(--ink-100) bg-white p-4">
                    <div className="flex gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-(--surface-alt,#F7F9FC)">
                        {item.product.media[0] ? (
                          <Image src={item.product.media[0].url} alt={item.product.title} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-(--ink-500)">No image</div>
                        )}
                      </div>

                      <div className="flex-1">
                        <Link href={`/decoration/${item.product.slug}`} className="font-display text-sm font-semibold text-(--navy-800) hover:text-accent">
                          {item.product.title}
                        </Link>
                        {item.variant && (
                          <p className="mt-0.5 flex items-center gap-1.5 font-sans text-xs text-(--ink-700)">
                            {item.variant.swatches.length > 0 && (
                              <span className="flex overflow-hidden rounded-full border border-(--ink-100)">
                                {item.variant.swatches.slice(0, 2).map((color, ci) => (
                                  <span key={ci} className="h-3 w-3" style={{ backgroundColor: color }} />
                                ))}
                              </span>
                            )}
                            {item.variant.name}
                          </p>
                        )}
                        <p className="mt-0.5 font-heading text-sm font-semibold text-primary">&#8377;{item.product.price}</p>
                        <p className="font-sans text-xs text-(--ink-500)">&#8377;{item.product.price} per booking</p>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <div className="flex items-center gap-1 rounded-full border border-(--ink-300) px-1 py-1">
                          <button
                            onClick={() => (item.qty > 1 ? updateQty(item.id, item.qty - 1) : removeItem(item.id))}
                            className="rounded-full p-1 text-(--ink-700) hover:bg-(--surface-alt,#F7F9FC)"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-5 text-center font-heading text-sm font-semibold">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            className="rounded-full p-1 text-(--ink-700) hover:bg-(--surface-alt,#F7F9FC)"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="flex items-center gap-1 font-sans text-xs text-(--coral-600) hover:underline"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>

                    {item.addOns.length > 0 && (
                      <div className="mt-3 border-t border-(--ink-100) pt-3 font-sans text-sm">
                        <span className="flex items-center gap-1.5 text-(--ink-700)">
                          🎁 Add-ons
                        </span>
                        <ul className="mt-1.5 flex flex-col gap-1">
                          {item.addOns.map((a) => (
                            <li key={a.id} className="flex items-center justify-between text-(--ink-700)">
                              <span>{a.name}</span>
                              <span className="font-semibold text-(--coral-600)">+&#8377;{Number(a.price).toLocaleString("en-IN")}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-2 flex justify-end font-heading text-sm font-semibold text-(--navy-800)">
                      Line total: &#8377;{lineTotal.toLocaleString("en-IN")}
                    </div>
                  </div>
                );
              })}
          </div>

        {!loading && items.length > 0 && (
          <SectionErrorBoundary fallbackMessage="Checkout couldn't load — please refresh the page or contact support.">
            <CheckoutSection />
          </SectionErrorBoundary>
        )}
      </div>
    </div>
  );
}
