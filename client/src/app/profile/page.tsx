"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Mail, Phone, LogOut, Package, ChevronRight, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { getJson, patchJson, ApiError } from "@/lib/api";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  eventDate: string;
  total: string;
  amountDue: string;
  itemCount: number;
  thumbnailTitle: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-(--surface-alt,#F7F9FC) text-(--ink-500)",
  CONFIRMED: "bg-(--blue-600)/10 text-(--blue-600)",
  ASSIGNED: "bg-(--blue-600)/10 text-(--blue-600)",
  IN_PROGRESS: "bg-(--orange-600)/10 text-(--orange-600)",
  COMPLETED: "bg-(--success,#15803D)/10 text-(--success,#15803D)",
  CANCELLED: "bg-(--coral-600)/10 text-(--coral-600)",
  REFUNDED: "bg-(--coral-600)/10 text-(--coral-600)",
};

export default function ProfilePage() {
  const { isAuthenticated, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    Promise.all([getJson<Profile>("/profile"), getJson<OrderSummary[]>("/checkout/my-orders")])
      .then(([p, o]) => {
        setProfile(p);
        setForm({ name: p.name || "", email: p.email || "" });
        setOrders(o);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await patchJson<Profile>("/profile", form);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <p className="font-sans text-sm text-(--ink-700)">Log in to view your profile and orders.</p>
            <Link href="/login" className="mt-3 inline-block rounded-full bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground">
              Log In
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-(--surface-alt,#F7F9FC)">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
          <h1 className="font-display text-2xl font-semibold text-primary">My Profile</h1>

          {loading && (
            <div className="mt-6 flex items-center justify-center gap-2 py-10 font-sans text-sm text-(--ink-500)">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          )}

          {!loading && profile && (
            <>
              <div className="mt-6 rounded-2xl border border-(--ink-100) bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-heading text-base font-semibold text-(--navy-800)">{profile.name || "Add your name"}</p>
                      <p className="flex items-center gap-1 font-sans text-xs text-(--ink-500)">
                        <Phone className="h-3 w-3" /> +91 {profile.phone}
                      </p>
                    </div>
                  </div>
                  {!editing && (
                    <button onClick={() => setEditing(true)} className="font-heading text-xs font-semibold text-accent">
                      Edit
                    </button>
                  )}
                </div>

                {editing ? (
                  <form className="mt-4 flex flex-col gap-3" onSubmit={handleSave}>
                    <input
                      placeholder="Full name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                    />
                    <input
                      type="email"
                      placeholder="Email (for booking confirmations)"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
                    />
                    {error && <p className="font-sans text-xs text-(--coral-600)">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
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
                ) : (
                  profile.email && (
                    <p className="mt-3 flex items-center gap-1.5 font-sans text-xs text-(--ink-500)">
                      <Mail className="h-3.5 w-3.5" /> {profile.email}
                    </p>
                  )
                )}
              </div>

              <button
                onClick={logout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-(--ink-300) py-2.5 font-heading text-sm font-semibold text-(--ink-700)"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>

              <h2 className="mt-8 font-heading text-base font-semibold text-(--navy-800)">My Orders</h2>

              {orders.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-(--ink-100) bg-white p-8 text-center font-sans text-sm text-(--ink-500)">
                  No bookings yet.
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/profile/orders/${order.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-(--ink-100) bg-white p-4 hover:shadow-sm"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--surface-alt,#F7F9FC)">
                        <Package className="h-4 w-4 text-(--ink-700)" />
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-heading text-sm font-semibold text-(--navy-800)">{order.orderNumber}</p>
                          <span className={`rounded-full px-2 py-0.5 font-heading text-[10px] font-semibold ${STATUS_STYLES[order.status] || "bg-(--surface-alt,#F7F9FC) text-(--ink-500)"}`}>
                            {order.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="font-sans text-xs text-(--ink-500)">
                          {order.thumbnailTitle}{order.itemCount > 1 ? ` + ${order.itemCount - 1} more` : ""} &middot; {order.eventDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-sm font-semibold text-(--navy-800)">&#8377;{order.total}</p>
                        {Number(order.amountDue) > 0 && <p className="font-sans text-[10px] text-(--coral-600)">&#8377;{order.amountDue} due</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-(--ink-500)" />
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
