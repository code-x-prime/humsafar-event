import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AllCategoriesGrid, type MenuCategory } from "@/components/AllCategoriesGrid";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getCategoryMenu(): Promise<MenuCategory[]> {
  const res = await fetch(`${API_BASE}/categories/menu`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data : [];
}

export const metadata = {
  title: "All Categories — Humsafar Events",
};

export default async function CategoriesPage() {
  const categories = await getCategoryMenu();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="border-b border-(--ink-100) bg-(--surface-warm,#FFF9F2) px-4 py-8 text-center sm:py-12">
          <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
            Browse
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-(--navy-800) sm:text-3xl">
            All Categories
          </h1>
          <p className="mx-auto mt-2.5 max-w-md font-sans text-sm text-(--ink-500)">
            Explore every decoration category we offer
          </p>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <AllCategoriesGrid categories={categories} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
