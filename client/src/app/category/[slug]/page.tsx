import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CategoryListing, type CategoryDetail } from "@/components/CategoryListing";
import { notFound } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getCategory(
  slug: string,
  query: { sort?: string; minPrice?: string; maxPrice?: string }
): Promise<CategoryDetail | null> {
  const params = new URLSearchParams();
  if (query.sort) params.set("sort", query.sort);
  if (query.minPrice) params.set("minPrice", query.minPrice);
  if (query.maxPrice) params.set("maxPrice", query.maxPrice);
  const qs = params.toString();

  const res = await fetch(`${API_BASE}/categories/${slug}${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (res.status === 404) return null;

  const json = await res.json();
  return json.success ? json.data : null;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; minPrice?: string; maxPrice?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const category = await getCategory(slug, query);

  if (!category) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-(--surface-alt,#F7F9FC)">
        <CategoryListing category={category} activeSort={query.sort} activeMinPrice={query.minPrice} activeMaxPrice={query.maxPrice} />
      </main>

      <Footer />
    </div>
  );
}
