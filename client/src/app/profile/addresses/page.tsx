"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Star, Trash2, Pencil, Plus, Loader2, PartyPopper, ShoppingBag } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCity } from "@/context/CityContext";
import { getJson, postJson, patchJson, deleteJson, ApiError } from "@/lib/api";

interface City {
  id: string;
  name: string;
  slug: string;
}

interface BookingAddress {
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

const EMPTY_BOOKING_FORM = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  cityId: "",
  pincode: "",
};

const EMPTY_SHOP_FORM = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
};

type Tab = "booking" | "shop";

export default function AddressesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { citiesByRegion } = useCity();
  const cities: City[] = Object.values(citiesByRegion).flat();

  const [tab, setTab] = useState<Tab>("booking");
  const [loading, setLoading] = useState(true);

  const [bookingAddresses, setBookingAddresses] = useState<BookingAddress[]>([]);
  const [shopAddresses, setShopAddresses] = useState<ShopAddress[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState(EMPTY_BOOKING_FORM);
  const [shopForm, setShopForm] = useState(EMPTY_SHOP_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    Promise.all([getJson<BookingAddress[]>("/addresses"), getJson<ShopAddress[]>("/shop/addresses")])
      .then(([b, s]) => {
        setBookingAddresses(b);
        setShopAddresses(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  function openAddForm() {
    setEditingId(null);
    setBookingForm(EMPTY_BOOKING_FORM);
    setShopForm(EMPTY_SHOP_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(tabType: Tab, address: BookingAddress | ShopAddress) {
    setEditingId(address.id);
    setError(null);
    if (tabType === "booking") {
      const a = address as BookingAddress;
      setBookingForm({
        fullName: a.fullName,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2 || "",
        landmark: a.landmark || "",
        cityId: a.city.id,
        pincode: a.pincode,
      });
    } else {
      const a = address as ShopAddress;
      setShopForm({
        fullName: a.fullName,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2 || "",
        landmark: a.landmark || "",
        city: a.city,
        state: a.state,
        pincode: a.pincode,
      });
    }
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (tab === "booking") {
        if (editingId) {
          const updated = await patchJson<BookingAddress>(`/addresses/${editingId}`, bookingForm);
          setBookingAddresses((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
        } else {
          const created = await postJson<BookingAddress>("/addresses", bookingForm);
          setBookingAddresses((prev) => [created, ...prev]);
        }
      } else {
        if (editingId) {
          const updated = await patchJson<ShopAddress>(`/shop/addresses/${editingId}`, shopForm);
          setShopAddresses((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
        } else {
          const created = await postJson<ShopAddress>("/shop/addresses", shopForm);
          setShopAddresses((prev) => [created, ...prev]);
        }
      }
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save address");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tabType: Tab, id: string) {
    if (tabType === "booking") {
      await deleteJson(`/addresses/${id}`).catch(() => {});
      setBookingAddresses((prev) => prev.filter((a) => a.id !== id));
    } else {
      await deleteJson(`/shop/addresses/${id}`).catch(() => {});
      setShopAddresses((prev) => prev.filter((a) => a.id !== id));
    }
  }

  async function handleSetDefault(tabType: Tab, id: string) {
    if (tabType === "booking") {
      const updated = await patchJson<BookingAddress>(`/addresses/${id}`, { isDefault: true });
      setBookingAddresses((prev) => prev.map((a) => (a.id === id ? updated : { ...a, isDefault: false })));
    } else {
      const updated = await patchJson<ShopAddress>(`/shop/addresses/${id}`, { isDefault: true });
      setShopAddresses((prev) => prev.map((a) => (a.id === id ? updated : { ...a, isDefault: false })));
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="font-sans text-sm text-(--ink-700)">Log in to manage your addresses.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const activeCount = tab === "booking" ? bookingAddresses.length : shopAddresses.length;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-(--surface-alt,#F7F9FC)">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-full bg-white p-2 text-(--ink-700) shadow-sm hover:text-accent"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="font-display text-xl font-semibold text-primary sm:text-2xl">My Addresses</h1>
          </div>

          {loading && (
            <div className="mt-6 flex items-center justify-center gap-2 py-10 font-sans text-sm text-(--ink-500)">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          )}

          {!loading && (
            <>
              {/* Tabs */}
              <div className="mt-6 flex gap-2 rounded-full bg-white p-1.5 shadow-sm">
                <button
                  onClick={() => {
                    setTab("booking");
                    setShowForm(false);
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 font-heading text-sm font-semibold transition-colors ${
                    tab === "booking" ? "bg-primary text-primary-foreground" : "text-(--ink-700)"
                  }`}
                >
                  <PartyPopper className="h-4 w-4" />
                  Decoration
                  {bookingAddresses.length > 0 && (
                    <span
                      className={`ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                        tab === "booking" ? "bg-white/25 text-primary-foreground" : "bg-(--coral-600) text-white"
                      }`}
                    >
                      {bookingAddresses.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setTab("shop");
                    setShowForm(false);
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 font-heading text-sm font-semibold transition-colors ${
                    tab === "shop" ? "bg-primary text-primary-foreground" : "text-(--ink-700)"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Shop With Us
                  {shopAddresses.length > 0 && (
                    <span
                      className={`ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                        tab === "shop" ? "bg-white/25 text-primary-foreground" : "bg-(--coral-600) text-white"
                      }`}
                    >
                      {shopAddresses.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Address list */}
              <div className="mt-4 flex flex-col gap-3">
                {tab === "booking" &&
                  bookingAddresses.map((a) => (
                    <div key={a.id} className="rounded-2xl border border-(--ink-100) bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--ink-500)" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-heading text-sm font-semibold text-(--navy-800)">{a.fullName}</p>
                              {a.isDefault && (
                                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-heading text-[10px] font-semibold text-primary">
                                  <Star className="h-2.5 w-2.5 fill-current" /> Default
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 font-sans text-xs text-(--ink-700)">
                              {a.line1}
                              {a.line2 ? `, ${a.line2}` : ""}
                              {a.landmark ? `, ${a.landmark}` : ""}
                            </p>
                            <p className="font-sans text-xs text-(--ink-500)">
                              {a.city.name} &middot; {a.pincode} &middot; {a.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => openEditForm("booking", a)}
                            className="rounded-full p-2 text-(--ink-500) hover:bg-(--surface-alt,#F7F9FC) hover:text-(--blue-600)"
                            aria-label="Edit address"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete("booking", a.id)}
                            className="rounded-full p-2 text-(--ink-500) hover:bg-(--surface-alt,#F7F9FC) hover:text-(--coral-600)"
                            aria-label="Delete address"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {!a.isDefault && (
                        <button
                          onClick={() => handleSetDefault("booking", a.id)}
                          className="mt-3 font-sans text-xs font-semibold text-accent hover:underline"
                        >
                          Set as default
                        </button>
                      )}
                    </div>
                  ))}

                {tab === "shop" &&
                  shopAddresses.map((a) => (
                    <div key={a.id} className="rounded-2xl border border-(--ink-100) bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--ink-500)" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-heading text-sm font-semibold text-(--navy-800)">{a.fullName}</p>
                              {a.isDefault && (
                                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-heading text-[10px] font-semibold text-primary">
                                  <Star className="h-2.5 w-2.5 fill-current" /> Default
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 font-sans text-xs text-(--ink-700)">
                              {a.line1}
                              {a.line2 ? `, ${a.line2}` : ""}
                              {a.landmark ? `, ${a.landmark}` : ""}
                            </p>
                            <p className="font-sans text-xs text-(--ink-500)">
                              {a.city}, {a.state} &middot; {a.pincode} &middot; {a.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => openEditForm("shop", a)}
                            className="rounded-full p-2 text-(--ink-500) hover:bg-(--surface-alt,#F7F9FC) hover:text-(--blue-600)"
                            aria-label="Edit address"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete("shop", a.id)}
                            className="rounded-full p-2 text-(--ink-500) hover:bg-(--surface-alt,#F7F9FC) hover:text-(--coral-600)"
                            aria-label="Delete address"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {!a.isDefault && (
                        <button
                          onClick={() => handleSetDefault("shop", a.id)}
                          className="mt-3 font-sans text-xs font-semibold text-accent hover:underline"
                        >
                          Set as default
                        </button>
                      )}
                    </div>
                  ))}

                {activeCount === 0 && !showForm && (
                  <div className="rounded-2xl border border-(--ink-100) bg-white p-8 text-center font-sans text-sm text-(--ink-500)">
                    No {tab === "booking" ? "decoration" : "shop"} addresses saved yet.
                  </div>
                )}
              </div>

              {!showForm && (
                <button
                  onClick={openAddForm}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-(--ink-300) py-3 font-heading text-sm font-semibold text-(--ink-700) hover:border-accent hover:text-accent"
                >
                  <Plus className="h-4 w-4" /> Add {tab === "booking" ? "Decoration" : "Shop"} Address
                </button>
              )}

              {showForm && tab === "booking" && (
                <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3 rounded-2xl border border-(--ink-100) bg-white p-4">
                  <p className="font-heading text-sm font-semibold text-(--navy-800)">
                    {editingId ? "Edit address" : "New decoration address"}
                  </p>
                  <input
                    placeholder="Full name"
                    value={bookingForm.fullName}
                    onChange={(e) => setBookingForm({ ...bookingForm, fullName: e.target.value })}
                    required
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  <input
                    placeholder="Phone"
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    required
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  <input
                    placeholder="Address line 1"
                    value={bookingForm.line1}
                    onChange={(e) => setBookingForm({ ...bookingForm, line1: e.target.value })}
                    required
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  <input
                    placeholder="Address line 2 (optional)"
                    value={bookingForm.line2}
                    onChange={(e) => setBookingForm({ ...bookingForm, line2: e.target.value })}
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  <input
                    placeholder="Landmark (optional)"
                    value={bookingForm.landmark}
                    onChange={(e) => setBookingForm({ ...bookingForm, landmark: e.target.value })}
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  <select
                    value={bookingForm.cityId}
                    onChange={(e) => setBookingForm({ ...bookingForm, cityId: e.target.value })}
                    required
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  >
                    <option value="">Select city</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Pincode"
                    value={bookingForm.pincode}
                    onChange={(e) => setBookingForm({ ...bookingForm, pincode: e.target.value })}
                    required
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  {error && <p className="font-sans text-xs text-(--coral-600)">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 rounded-full border border-(--ink-300) py-2 font-heading text-sm font-semibold text-(--ink-700)"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 rounded-full bg-primary py-2 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              )}

              {showForm && tab === "shop" && (
                <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3 rounded-2xl border border-(--ink-100) bg-white p-4">
                  <p className="font-heading text-sm font-semibold text-(--navy-800)">
                    {editingId ? "Edit address" : "New shop address"}
                  </p>
                  <input
                    placeholder="Full name"
                    value={shopForm.fullName}
                    onChange={(e) => setShopForm({ ...shopForm, fullName: e.target.value })}
                    required
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  <input
                    placeholder="Phone"
                    value={shopForm.phone}
                    onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                    required
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  <input
                    placeholder="Address line 1"
                    value={shopForm.line1}
                    onChange={(e) => setShopForm({ ...shopForm, line1: e.target.value })}
                    required
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  <input
                    placeholder="Address line 2 (optional)"
                    value={shopForm.line2}
                    onChange={(e) => setShopForm({ ...shopForm, line2: e.target.value })}
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  <input
                    placeholder="Landmark (optional)"
                    value={shopForm.landmark}
                    onChange={(e) => setShopForm({ ...shopForm, landmark: e.target.value })}
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="City"
                      value={shopForm.city}
                      onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })}
                      required
                      className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                    />
                    <input
                      placeholder="State"
                      value={shopForm.state}
                      onChange={(e) => setShopForm({ ...shopForm, state: e.target.value })}
                      required
                      className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                    />
                  </div>
                  <input
                    placeholder="Pincode"
                    value={shopForm.pincode}
                    onChange={(e) => setShopForm({ ...shopForm, pincode: e.target.value })}
                    required
                    className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                  />
                  {error && <p className="font-sans text-xs text-(--coral-600)">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 rounded-full border border-(--ink-300) py-2 font-heading text-sm font-semibold text-(--ink-700)"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 rounded-full bg-primary py-2 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
