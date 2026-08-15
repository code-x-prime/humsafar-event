"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getJson, postJson, deleteJson, ApiError } from "@/lib/api";
import { loadRazorpayScript } from "@/lib/loadRazorpayScript";

interface ShopAddress {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface PreviewData {
  items: { productId: string; title: string; qty: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  shippingCharge: number;
  total: number;
}

const EMPTY_ADDRESS_FORM = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
};

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function ShopCheckoutSection() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { cart, refresh: refreshCart } = useCart();

  const [addresses, setAddresses] = useState<ShopAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [savingAddress, setSavingAddress] = useState(false);

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;

  useEffect(() => {
    if (!isAuthenticated) return;
    getJson<ShopAddress[]>("/shop/addresses")
      .then((data) => {
        setAddresses(data);
        const def = data.find((a) => a.isDefault) || data[0];
        if (def) setSelectedAddressId(def.id);
        else setShowAddressForm(true);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setPreview(null);
      return;
    }
    getJson<PreviewData>("/shop/checkout/preview")
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [isAuthenticated, cart]);

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const created = await postJson<ShopAddress>("/shop/addresses", addressForm);
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      setAddressForm(EMPTY_ADDRESS_FORM);
    } catch (err) {
      setPayError(errorMessage(err, "Could not save address"));
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    await deleteJson(`/shop/addresses/${id}`).catch(() => {});
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    if (selectedAddressId === id) setSelectedAddressId(null);
  }

  async function handlePay() {
    if (!selectedAddress || paying) return;

    setPaying(true);
    setPayError(null);

    try {
      const order = await postJson<{
        orderId: string;
        orderNumber: string;
        amountDueNow: number;
        razorpayOrder: { id: string; amount: number; currency: string } | null;
        razorpayKeyId: string | null;
      }>("/shop/checkout/orders", { addressId: selectedAddress.id });

      if (!order.razorpayOrder) {
        setPayError("Online payment isn't set up yet — please contact support to complete your order.");
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
        name: "Humsafar Events — Shop With Us",
        description: `Order ${order.orderNumber}`,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await postJson(`/shop/checkout/orders/${order.orderId}/verify`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            await refreshCart();
            router.push(`/shop/orders/${order.orderId}/confirmed`);
          } catch (err) {
            setPayError(err instanceof ApiError ? err.message : "Payment verification failed. Contact support if money was deducted.");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            postJson(`/shop/checkout/orders/${order.orderId}/cancel`).catch(() => {});
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
        <p className="font-sans text-sm text-(--ink-700)">Log in to choose an address and complete your order.</p>
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
      {/* Address */}
      <div className="rounded-2xl border border-(--ink-100) bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--coral-100)">
            <MapPin className="h-4 w-4 text-(--coral-600)" />
          </span>
          <p className="font-heading text-sm font-semibold text-(--navy-800)">Shipping Address</p>
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
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} — {addr.pincode}
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
            <div className="grid grid-cols-3 gap-3">
              <input
                required
                placeholder="City"
                value={addressForm.city}
                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
              />
              <input
                required
                placeholder="State"
                value={addressForm.state}
                onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
              />
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

      {/* Order Summary */}
      {preview && (
        <div className="rounded-2xl border border-(--ink-100) bg-white p-4">
          <p className="font-heading text-sm font-semibold text-(--navy-800)">Order Summary</p>

          <div className="mt-3 flex flex-col gap-2 border-b border-(--ink-100) pb-3">
            {preview.items.map((item) => (
              <div key={item.productId} className="flex justify-between font-sans text-sm text-(--ink-700)">
                <span>
                  {item.title}
                  {item.qty > 1 ? ` × ${item.qty}` : ""}
                </span>
                <span>&#8377;{item.subtotal.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-1.5 font-sans text-sm">
            <div className="flex justify-between text-(--ink-700)">
              <span>Subtotal</span>
              <span>&#8377;{preview.subtotal.toLocaleString("en-IN")}</span>
            </div>
            {preview.taxAmount > 0 && (
              <div className="flex justify-between text-(--ink-700)">
                <span>Tax ({preview.taxPercent}%)</span>
                <span>&#8377;{preview.taxAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
            {preview.shippingCharge > 0 && (
              <div className="flex justify-between text-(--ink-700)">
                <span>Shipping</span>
                <span>&#8377;{preview.shippingCharge.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-(--ink-100) pt-1.5 font-heading font-semibold text-(--navy-800)">
              <span>Total</span>
              <span>&#8377;{preview.total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      )}

      {payError && (
        <p className="rounded-xl bg-(--coral-600)/10 px-4 py-3 font-sans text-sm text-(--coral-600)">{payError}</p>
      )}

      <button
        onClick={handlePay}
        disabled={!selectedAddress || !preview || paying}
        className="flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {paying ? "Processing..." : preview ? `Pay ₹${preview.total.toLocaleString("en-IN")}` : "Pay Now"}
      </button>
    </div>
  );
}
