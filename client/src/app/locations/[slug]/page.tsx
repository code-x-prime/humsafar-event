import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CategoryGrid, type HomeCategory } from "@/components/CategoryGrid";
import { SetCityOnVisit } from "@/components/SetCityOnVisit";
import { MapPin, CheckCircle2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface CityData {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  region: string | null;
  isServiceable: boolean;
  comingSoon: boolean;
}

async function getCity(slug: string): Promise<CityData | null> {
  const res = await fetch(`${API_BASE}/cities/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.success ? json.data : null;
}

async function getHomeCategories(): Promise<HomeCategory[]> {
  const res = await fetch(`${API_BASE}/categories/home`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data : [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = await getCity(slug);
  if (!city) return { title: "City Not Found — Humsafar Events" };
  return {
    title: `Event Decoration in ${city.name} — Humsafar Events`,
    description: `Book premium event and party decorations in ${city.name}. Same-day setup, trusted by hundreds of happy customers.`,
  };
}

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [city, categories] = await Promise.all([getCity(slug), getHomeCategories()]);

  if (!city) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <SetCityOnVisit city={city} />

      <main className="flex-1">
        <div className="border-b border-(--ink-100) bg-(--surface-warm,#FFF9F2) px-4 py-10 text-center sm:py-14">
          <p className="flex items-center justify-center gap-1.5 font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
            <MapPin className="h-3.5 w-3.5" />
            {city.region || city.state}
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-(--navy-800) sm:text-4xl">
            Event Decoration in {city.name}
          </h1>
          <p className="mx-auto mt-3 max-w-lg font-sans text-sm text-(--ink-500) sm:text-base">
            Premium birthday, anniversary &amp; party decorations delivered and set up across {city.name}.
          </p>

          {city.isServiceable ? (
            <p className="mx-auto mt-4 flex w-fit items-center gap-1.5 rounded-full bg-(--success,#15803D)/10 px-4 py-1.5 font-heading text-xs font-semibold text-(--success,#15803D)">
              <CheckCircle2 className="h-3.5 w-3.5" />
              We currently deliver in {city.name}
            </p>
          ) : (
            <p className="mx-auto mt-4 w-fit rounded-full bg-(--orange-100) px-4 py-1.5 font-heading text-xs font-semibold text-(--orange-600)">
              Coming soon to {city.name}
            </p>
          )}
        </div>

        <CategoryGrid categories={categories} />
      </main>

      <Footer />
    </div>
  );
}
