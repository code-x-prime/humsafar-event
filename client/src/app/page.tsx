import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryGrid, type HomeCategory } from "@/components/CategoryGrid";
import { HomeCategorySection, type HomeSection } from "@/components/HomeCategorySection";
import { HomeBannerRow, type HomeBanner } from "@/components/HomeBannerRow";
import { TestimonialsCarousel, type Testimonial } from "@/components/TestimonialsCarousel";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type HomeFeedRow = { type: "section"; data: HomeSection } | { type: "banner"; data: HomeBanner };

async function getHomeFeed(): Promise<HomeFeedRow[]> {
  const res = await fetch(`${API_BASE}/products/home-feed`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data : [];
}

async function getTestimonials(): Promise<Testimonial[]> {
  const res = await fetch(`${API_BASE}/testimonials`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data : [];
}

async function getHomeCategories(): Promise<HomeCategory[]> {
  const res = await fetch(`${API_BASE}/categories/home`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data : [];
}

export default async function Home() {
  const [feed, testimonials, categories] = await Promise.all([
    getHomeFeed(),
    getTestimonials(),
    getHomeCategories(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-(--surface-warm,#FFF9F2) py-8 sm:py-12">
          <BannerCarousel placement="HOME_HERO" />
        </section>

        <CategoryGrid categories={categories} />

        {feed.map((row) =>
          row.type === "section" ? (
            <HomeCategorySection key={`section-${row.data.id}`} section={row.data} />
          ) : (
            <HomeBannerRow key={`banner-${row.data.id}`} banner={row.data} />
          )
        )}

        <TestimonialsCarousel testimonials={testimonials} />
      </main>

      <Footer />
    </div>
  );
}
