"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Plus, Minus, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCity } from "@/context/CityContext";

interface AddOn {
  id: string;
  name: string;
  price: string;
  image: string | null;
  category: { id: string; name: string; position: number } | null;
}

interface CustomizeOrderDialogProps {
  productId: string;
  productTitle: string;
  variantId?: string;
  addOns: AddOn[];
  open: boolean;
  onClose: () => void;
}

const UNCATEGORIZED = "__uncategorized__";

export function CustomizeOrderDialog({ productId, productTitle, variantId, addOns, open, onClose }: CustomizeOrderDialogProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { selectedCity } = useCity();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; position: number; addOns: AddOn[] }>();
    for (const addOn of addOns) {
      const key = addOn.category?.id || UNCATEGORIZED;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: addOn.category?.name || "More Add-ons",
          position: addOn.category?.position ?? 999,
          addOns: [],
        });
      }
      map.get(key)!.addOns.push(addOn);
    }
    return [...map.values()].sort((a, b) => a.position - b.position);
  }, [addOns]);

  const currentCategory = activeCategory
    ? categories.find((c) => c.id === activeCategory) || categories[0]
    : categories[0];

  const selectedAddOnIds = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([id]) => id);

  const selectedCount = selectedAddOnIds.length;

  function setQty(addOnId: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [addOnId]: Math.max(0, qty) }));
  }

  async function handleProceed(skip: boolean) {
    setSubmitting(true);
    try {
      await addToCart({
        productId,
        variantId,
        addOnIds: skip ? [] : selectedAddOnIds,
        qty: 1,
        cityId: selectedCity?.id,
      });
      onClose();
      router.push("/cart");
    } catch {
      // addToCart's caller (CartContext) already surfaces errors via its own state;
      // dialog just stays open so the customer can retry.
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-(--ink-100) p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-primary">Customize Your Order</h2>
              <p className="font-sans text-xs text-(--ink-500)">Add extras to make it special</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-(--surface-alt,#F7F9FC) p-2 text-(--ink-700) hover:bg-(--ink-100)">
            <X className="h-4 w-4" />
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="flex-1 p-8 text-center font-sans text-sm text-(--ink-500)">
            No add-ons available for {productTitle} — proceed straight to your cart.
          </div>
        ) : (
          <>
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto border-b border-(--ink-100) p-3 scrollbar-none sm:px-5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 font-heading text-sm font-medium transition-colors ${
                    currentCategory?.id === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-(--ink-300) text-(--ink-700) hover:border-(--blue-600)"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Add-on grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {currentCategory?.addOns.map((addOn) => {
                  const qty = quantities[addOn.id] || 0;
                  return (
                    <div key={addOn.id} className="overflow-hidden rounded-xl border border-(--ink-100)">
                      <div className="relative aspect-square w-full bg-(--surface-alt,#F7F9FC)">
                        {addOn.image ? (
                          <Image src={addOn.image} alt={addOn.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center font-sans text-xs text-(--ink-500)">
                            No image
                          </div>
                        )}
                        {qty > 0 && (
                          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                            {qty}
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-2 min-h-8 font-heading text-xs font-medium text-(--navy-800)">
                          {addOn.name}
                        </p>
                        <p className="mt-1 font-heading text-sm font-semibold text-(--navy-800)">&#8377;{addOn.price}</p>

                        {qty === 0 ? (
                          <button
                            onClick={() => setQty(addOn.id, 1)}
                            className="mt-2 w-full rounded-full border border-primary py-1.5 font-heading text-xs font-semibold text-primary hover:bg-primary/5"
                          >
                            + ADD
                          </button>
                        ) : (
                          <div className="mt-2 flex items-center justify-between rounded-full border border-primary px-1 py-1">
                            <button onClick={() => setQty(addOn.id, qty - 1)} className="rounded-full p-1 text-primary hover:bg-primary/10" aria-label="Decrease">
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-heading text-xs font-semibold text-primary">{qty}</span>
                            <button onClick={() => setQty(addOn.id, qty + 1)} className="rounded-full p-1 text-primary hover:bg-primary/10" aria-label="Increase">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-(--ink-100) p-4 sm:p-5">
          <div className="font-sans text-sm">
            <span className="text-(--ink-500)">SELECTED</span>
            <p className="font-heading font-semibold text-(--navy-800)">{selectedCount} add-on{selectedCount === 1 ? "" : "s"}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleProceed(true)}
              disabled={submitting}
              className="rounded-full bg-(--surface-alt,#F7F9FC) px-5 py-2.5 font-heading text-sm font-semibold text-(--ink-700) disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={() => handleProceed(false)}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Proceed to Cart"} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
