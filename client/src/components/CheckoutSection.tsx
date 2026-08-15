"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, CalendarDays, MapPin, Tag, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useCity } from "@/context/CityContext";
import { getJson, postJson, deleteJson, ApiError } from "@/lib/api";
import { loadRazorpayScript } from "@/lib/loadRazorpayScript";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface City {
  id: string;
  name: string;
  slug: string;
}

interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  pincode: string;
  isDefault: boolean;
  city: City;
}

interface SlotOption {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  surgeCharge: string;
  available: boolean;
  remaining: number;
}

interface EligibleCoupon {
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: string;
  maxDiscount: string | null;
  minOrderValue: string | null;
  newUserOnly: boolean;
  minRepeatOrders: number | null;
  estimatedDiscount: number;
}

interface PreviewData {
  subtotal: number;
  addOnTotal: number;
  discount: number;
  couponCode: string | null;
  total: number;
  advanceDueNow: number;
  advancePercent: number | null;
}

const EMPTY_ADDRESS_FORM = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  cityId: "",
  pincode: "",
};

function nextDays(count: number) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export function CheckoutSection() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { cart, refresh: refreshCart } = useCart();
  const { citiesByRegion } = useCity();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [savingAddress, setSavingAddress] = useState(false);

  const cities: City[] = Object.values(citiesByRegion).flat();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [customDatePopoverOpen, setCustomDatePopoverOpen] = useState(false);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [eligibleCoupons, setEligibleCoupons] = useState<EligibleCoupon[]>([]);

  const [paymentMode, setPaymentMode] = useState<"FULL" | "ADVANCE">("FULL");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;

  useEffect(() => {
    if (!isAuthenticated) return;
    getJson<Address[]>("/addresses")
      .then((data) => {
        setAddresses(data);
        const def = data.find((a) => a.isDefault) || data[0];
        if (def) setSelectedAddressId(def.id);
        else setShowAddressForm(true);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedDate || !selectedAddress) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setSelectedSlotId(null);
    getJson<SlotOption[]>(`/slots/availability?cityId=${selectedAddress.city.id}&date=${selectedDate}`)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedAddress]);

  useEffect(() => {
    if (!isAuthenticated || !selectedAddress) {
      setPreview(null);
      return;
    }
    const params = new URLSearchParams({ cityId: selectedAddress.city.id });
    if (appliedCoupon) params.set("couponCode", appliedCoupon);
    getJson<PreviewData>(`/checkout/preview?${params.toString()}`)
      .then((data) => {
        setPreview(data);
        if (appliedCoupon) setCouponError(null);
      })
      .catch((err) => {
        if (appliedCoupon) {
          // The coupon caused this failure (bad code, expired, new-users-only,
          // etc.) — drop it and re-fetch without it so the rest of checkout
          // still works, but tell the customer why it didn't apply.
          setCouponError(err instanceof ApiError ? err.message : "Couldn't apply that coupon. Please try again.");
          setAppliedCoupon(null);
        } else {
          setPreview(null);
        }
      });
  }, [isAuthenticated, selectedAddress, appliedCoupon, cart]);

  // Coupons the customer qualifies for right now — including new-user-only
  // codes for first-time customers — surfaced automatically so they don't
  // need to already know a code exists.
  useEffect(() => {
    if (!isAuthenticated || !cart?.items.length) {
      setEligibleCoupons([]);
      return;
    }
    getJson<EligibleCoupon[]>("/checkout/eligible-coupons")
      .then(setEligibleCoupons)
      .catch(() => setEligibleCoupons([]));
  }, [isAuthenticated, cart]);

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const created = await postJson<Address>("/addresses", addressForm);
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      setAddressForm(EMPTY_ADDRESS_FORM);
    } catch (err) {
      setCouponError(err instanceof ApiError ? err.message : "Could not save address");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    await deleteJson(`/addresses/${id}`).catch(() => {});
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    if (selectedAddressId === id) setSelectedAddressId(null);
  }

  async function applyCoupon() {
    setCouponError(null);
    if (!couponInput.trim()) return;
    setAppliedCoupon(couponInput.trim().toUpperCase());
  }

  async function handlePay() {
    if (!selectedAddress || !selectedDate || paying) return;

    setPaying(true);
    setPayError(null);

    try {
      const order = await postJson<{
        orderId: string;
        orderNumber: string;
        amountDueNow: number;
        razorpayOrder: { id: string; amount: number; currency: string } | null;
        razorpayKeyId: string | null;
      }>(
        "/checkout/orders",
        {
          addressId: selectedAddress.id,
          eventDate: selectedDate,
          timeSlotId: selectedSlotId || undefined,
          paymentMode,
          couponCode: appliedCoupon || undefined,
        }
      );

      if (!order.razorpayOrder) {
        setPayError("Online payment isn't set up yet — please contact support to complete your booking.");
        setPaying(false);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPayError("Couldn't load the payment gateway. Please check your connection and try again.");
        setPaying(false);
        return;
      }

      const RazorpayCtor = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay;
      const rzp = new RazorpayCtor({
        key: order.razorpayKeyId,
        order_id: order.razorpayOrder.id,
        amount: order.razorpayOrder.amount,
        currency: order.razorpayOrder.currency,
        name: "Humsafar Events",
        description: `Booking ${order.orderNumber}`,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await postJson(`/checkout/orders/${order.orderId}/verify`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            await refreshCart();
            router.push(`/orders/${order.orderId}/confirmed`);
          } catch (err) {
            setPayError(err instanceof ApiError ? err.message : "Payment verification failed. Contact support if money was deducted.");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            postJson(`/checkout/orders/${order.orderId}/cancel`).catch(() => {});
          },
        },
        theme: { color: "#C0355A" },
      });

      rzp.open();
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Could not start checkout. Please try again.");
      setPaying(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-(--ink-100) bg-white p-6 text-center">
        <p className="font-sans text-sm text-(--ink-700)">Log in to choose a date, address, and complete your booking.</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-3 rounded-full bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
        >
          Log In to Continue
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {/* Date & Slot */}
      <div className="rounded-2xl border border-(--ink-100) bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--coral-100)">
            <CalendarIcon className="h-4 w-4 text-(--coral-600)" />
          </span>
          <div>
            <p className="font-heading text-sm font-semibold text-(--navy-800)">Choose Date & Time</p>
            <p className="font-sans text-xs text-(--ink-500)">When should your setup be ready?</p>
          </div>
        </div>

        <div className="mt-3 flex items-stretch gap-2">
          <div className="flex flex-1 gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
            {nextDays(10).map((d) => {
              const iso = d.toISOString().slice(0, 10);
              const isSelected = selectedDate === iso;
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 font-heading text-xs transition-colors ${
                    isSelected ? "border-primary bg-primary/5 text-primary" : "border-(--ink-300) text-(--ink-700)"
                  }`}
                >
                  <span className="text-[10px] uppercase text-(--ink-500)">
                    {d.toLocaleDateString("en-IN", { weekday: "short" })}
                  </span>
                  <span className="text-lg font-semibold">{d.getDate()}</span>
                  <span className="text-[10px] text-(--ink-500)">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                </button>
              );
            })}
          </div>

          {/* Always visible, never scrolled out of view — picks any date via a styled popup calendar. */}
          <Popover open={customDatePopoverOpen} onOpenChange={setCustomDatePopoverOpen}>
            <PopoverTrigger
              className={`flex w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border py-2 font-heading text-xs transition-colors ${
                selectedDate && !nextDays(10).some((d) => d.toISOString().slice(0, 10) === selectedDate)
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-dashed border-(--ink-300) text-(--ink-700) hover:border-primary hover:text-primary"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="text-[10px]">Custom</span>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={
                  selectedDate && !nextDays(10).some((d) => d.toISOString().slice(0, 10) === selectedDate)
                    ? new Date(`${selectedDate}T00:00:00`)
                    : undefined
                }
                onSelect={(date) => {
                  if (!date) return;
                  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  setSelectedDate(iso);
                  setCustomDatePopoverOpen(false);
                }}
                disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                className="[--cell-size:2.25rem]"
                classNames={{
                  day_button: "hover:bg-primary/10",
                }}
                modifiersClassNames={{
                  selected: "bg-primary! text-primary-foreground!",
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {selectedDate && !nextDays(10).some((d) => d.toISOString().slice(0, 10) === selectedDate) && (
          <p className="mt-2 font-sans text-xs text-(--ink-700)">
            Selected: <span className="font-semibold text-primary">{new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
          </p>
        )}

        <div className="mt-3 rounded-lg bg-(--surface-alt,#F7F9FC) p-3 font-sans text-xs text-(--ink-500)">
          {!selectedDate && "Pick a date to see available time slots."}
          {selectedDate && loadingSlots && "Loading time slots..."}
          {selectedDate && !loadingSlots && slots.length === 0 && "No time slots configured for this city yet — we'll confirm timing after booking."}
          {selectedDate && !loadingSlots && slots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  disabled={!slot.available}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`rounded-full border px-3 py-1.5 font-heading text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    selectedSlotId === slot.id ? "border-primary bg-primary/10 text-primary" : "border-(--ink-300) text-(--ink-700)"
                  }`}
                >
                  {slot.label} {!slot.available && "(Full)"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="rounded-2xl border border-(--ink-100) bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--coral-100)">
            <MapPin className="h-4 w-4 text-(--coral-600)" />
          </span>
          <p className="font-heading text-sm font-semibold text-(--navy-800)">Delivery Address</p>
        </div>

        {!showAddressForm && (
          <div className="mt-3 flex flex-col gap-2">
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
                  selectedAddressId === addr.id ? "border-primary bg-primary/5" : "border-(--ink-100)"
                }`}
              >
                <input
                  type="radio"
                  className="mt-1"
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                />
                <div className="flex-1">
                  <p className="font-heading font-semibold text-(--navy-800)">{addr.fullName} &middot; {addr.phone}</p>
                  <p className="font-sans text-xs text-(--ink-500)">
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city.name} — {addr.pincode}
                  </p>
                </div>
                <button type="button" onClick={() => handleDeleteAddress(addr.id)} className="font-sans text-xs text-(--coral-600)">
                  Remove
                </button>
              </label>
            ))}

            <button
              onClick={() => setShowAddressForm(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-(--ink-300) py-2.5 font-heading text-sm text-(--ink-700) hover:border-primary hover:text-primary"
            >
              <Plus className="h-4 w-4" /> Add New Address
            </button>
          </div>
        )}

        {showAddressForm && (
          <form className="mt-3 flex flex-col gap-3" onSubmit={handleSaveAddress}>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="Full Name"
                value={addressForm.fullName}
                onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
              />
              <input
                required
                placeholder="Mobile Number"
                value={addressForm.phone}
                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
              />
            </div>
            <input
              required
              placeholder="Flat / House No."
              value={addressForm.line1}
              onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
              className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
            />
            <input
              placeholder="Area / Street"
              value={addressForm.line2}
              onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
              className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
            />
            <input
              placeholder="Landmark (optional)"
              value={addressForm.landmark}
              onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
              className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                required
                value={addressForm.cityId}
                onChange={(e) => setAddressForm({ ...addressForm, cityId: e.target.value })}
                className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
              >
                <option value="">Select City</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                required
                placeholder="Pincode"
                value={addressForm.pincode}
                onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
              />
            </div>
            <div className="flex gap-2">
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="flex-1 rounded-full border border-(--ink-300) py-2.5 font-heading text-sm font-semibold text-(--ink-700)"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={savingAddress}
                className="flex-1 rounded-full bg-primary py-2.5 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {savingAddress ? "Saving..." : "Use This Address"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Coupon */}
      <div className="rounded-2xl border border-(--ink-100) bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--coral-100)">
            <Tag className="h-4 w-4 text-(--coral-600)" />
          </span>
          <p className="font-heading text-sm font-semibold text-(--navy-800)">Have a Promo Code?</p>
        </div>

        {preview?.couponCode ? (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-(--success,#15803D)/30 bg-(--success,#15803D)/5 px-3 py-2.5">
            <span className="flex items-center gap-2">
              <span className="font-heading text-sm font-semibold text-(--success,#15803D)">{preview.couponCode}</span>
              <span className="font-sans text-xs text-(--ink-700)">
                applied — you saved &#8377;{preview.discount.toLocaleString("en-IN")}
              </span>
            </span>
            <button
              onClick={() => {
                setAppliedCoupon(null);
                setCouponInput("");
                setCouponError(null);
              }}
              className="shrink-0 font-heading text-xs font-semibold text-(--coral-600) hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3 flex gap-2">
              <input
                placeholder="Enter code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="flex-1 rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm uppercase outline-none focus:border-(--blue-600)"
              />
              <button onClick={applyCoupon} className="rounded-lg bg-(--surface-alt,#F7F9FC) px-4 font-heading text-sm font-semibold text-(--ink-700)">
                Apply
              </button>
            </div>
            {couponError && <p className="mt-2 font-sans text-xs text-(--coral-600)">{couponError}</p>}

            {eligibleCoupons.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {eligibleCoupons.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCouponInput(c.code);
                      setAppliedCoupon(c.code);
                    }}
                    className="flex items-center justify-between rounded-lg border border-dashed border-(--coral-600)/40 bg-(--coral-600)/5 px-3 py-2 text-left"
                  >
                    <span>
                      <span className="font-heading text-sm font-semibold text-(--coral-600)">{c.code}</span>
                      <span className="ml-2 font-sans text-xs text-(--ink-700)">
                        {c.newUserOnly ? "First order special — " : c.minRepeatOrders ? "Returning customer special — " : ""}
                        {c.type === "PERCENTAGE" ? `${c.value}% off` : `₹${c.value} off`}
                        {c.maxDiscount ? ` up to ₹${c.maxDiscount}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-heading text-xs font-semibold text-(--success,#15803D)">
                      Save &#8377;{c.estimatedDiscount.toLocaleString("en-IN")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Summary */}
      {preview && (
        <div className="rounded-2xl border border-(--ink-100) bg-white p-4">
          <p className="font-heading text-sm font-semibold text-(--navy-800)">Order Summary</p>

          {cart?.items && cart.items.some((item) => item.product) && (
            <div className="mt-3 flex flex-col gap-3 border-b border-(--ink-100) pb-3">
              {cart.items.filter((item) => item.product).map((item) => (
                <div key={item.id} className="font-sans text-sm">
                  <div className="flex justify-between text-(--ink-700)">
                    <span>
                      {item.product!.title}
                      {item.qty > 1 ? ` × ${item.qty}` : ""}
                    </span>
                    <span>&#8377;{Number(item.product!.price).toLocaleString("en-IN")}</span>
                  </div>
                  {item.addOns.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-0.5 pl-3">
                      {item.addOns.map((a) => (
                        <li key={a.id} className="flex justify-between text-xs text-(--ink-500)">
                          <span>+ {a.name}</span>
                          <span>&#8377;{Number(a.price).toLocaleString("en-IN")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-col gap-1.5 font-sans text-sm">
            <div className="flex justify-between text-(--ink-700)">
              <span>Subtotal</span>
              <span>&#8377;{preview.subtotal.toLocaleString("en-IN")}</span>
            </div>
            {preview.addOnTotal > 0 && (
              <div className="flex justify-between text-(--ink-500)">
                <span>Add-ons</span>
                <span>+&#8377;{preview.addOnTotal.toLocaleString("en-IN")}</span>
              </div>
            )}
            {preview.discount > 0 && (
              <div className="flex justify-between text-(--success,#15803D)">
                <span>Discount</span>
                <span>-&#8377;{preview.discount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-(--ink-100) pt-2 font-heading font-semibold text-(--navy-800)">
              <span>Total</span>
              <span>&#8377;{preview.total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment mode */}
      <div className="rounded-2xl border border-(--ink-100) bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="font-heading text-sm font-semibold text-(--navy-800)">How would you like to pay?</p>
          <span className="flex items-center gap-1 font-sans text-xs text-(--success,#15803D)">
            <ShieldCheck className="h-3.5 w-3.5" /> 100% Secure
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <button
            onClick={() => setPaymentMode("FULL")}
            className={`flex items-center justify-between rounded-xl border p-3 text-left ${
              paymentMode === "FULL" ? "border-primary bg-primary/5" : "border-(--ink-100)"
            }`}
          >
            <div>
              <p className="font-heading text-sm font-semibold text-(--navy-800)">Pay Full Amount</p>
              <p className="font-sans text-xs text-(--ink-500)">Nothing to pay after decoration is done</p>
            </div>
            {preview && <span className="font-heading text-sm font-semibold text-primary">&#8377;{preview.total.toLocaleString("en-IN")}</span>}
          </button>

          <button
            onClick={() => setPaymentMode("ADVANCE")}
            className={`flex items-center justify-between rounded-xl border p-3 text-left ${
              paymentMode === "ADVANCE" ? "border-primary bg-primary/5" : "border-(--ink-100)"
            }`}
          >
            <div>
              <p className="font-heading text-sm font-semibold text-(--navy-800)">
                Pay {preview?.advancePercent ?? 50}% Advance
              </p>
              <p className="font-sans text-xs text-(--ink-500)">
                {preview?.advancePercent ?? 50}% of decoration price now, rest after setup
                {preview && preview.addOnTotal > 0 ? " — add-ons charged in full now" : ""}
              </p>
            </div>
            {preview && <span className="font-heading text-sm font-semibold text-primary">&#8377;{preview.advanceDueNow.toLocaleString("en-IN")}</span>}
          </button>
        </div>

        {paymentMode === "ADVANCE" && preview && preview.addOnTotal > 0 && (
          <div className="mt-3 rounded-lg bg-(--surface-alt,#F7F9FC) p-3 font-sans text-xs text-(--ink-700)">
            <div className="flex justify-between">
              <span>Decoration advance ({preview.advancePercent ?? 50}%)</span>
              <span>&#8377;{(preview.advanceDueNow - preview.addOnTotal).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span>Add-ons (100% now)</span>
              <span>&#8377;{preview.addOnTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-(--ink-300)/40 pt-1 font-semibold">
              <span>Pay now</span>
              <span>&#8377;{preview.advanceDueNow.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {payError && <p className="mt-3 font-sans text-xs text-(--coral-600)">{payError}</p>}
      </div>

      {/* Sticky pay bar */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-(--ink-100) bg-white p-4 shadow-lg">
        <div>
          <p className="font-sans text-xs text-(--ink-500)">Pay now</p>
          <p className="font-heading text-lg font-semibold text-(--navy-800)">
            &#8377;{preview ? (paymentMode === "ADVANCE" ? preview.advanceDueNow.toLocaleString("en-IN") : preview.total.toLocaleString("en-IN")) : "—"}
          </p>
        </div>
        <button
          onClick={handlePay}
          disabled={!selectedAddress || !selectedDate || paying}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {paying && <Loader2 className="h-4 w-4 animate-spin" />}
          {!selectedAddress ? "Add Address First" : !selectedDate ? "Pick a Date First" : paying ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </div>
  );
}
