import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShopListing, type ShopCategorySummary } from "@/components/ShopListing";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export const metadata: Metadata = {
  title: "Shop With Us | Humsafar Events",
  description: "Shop premium decoration products, delivered to your doorstep.",
};

async function getCategories(): Promise<ShopCategorySummary[]> {
  const res = await fetch(`${API_BASE}/shop/categories`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data : [];
}

export default async function ShopPage() {
  const categories = await getCategories();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-(--surface-alt,#F7F9FC)">
        <div className="border-b border-(--ink-100) bg-(--surface-warm,#FFF9F2) px-4 py-10 text-center sm:py-14">
          <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
            Shop With Us
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-(--navy-800) sm:text-4xl">
            Bring the celebration home
          </h1>
          <p className="mx-auto mt-3 max-w-lg font-sans text-sm text-(--ink-500) sm:text-base">
            Party products, shipped straight to your door — no booking or setup crew needed.
          </p>
        </div>

        <ShopListing categories={categories} />
      </main>

      <Footer />
    </div>
  );
}
