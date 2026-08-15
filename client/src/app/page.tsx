import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryGrid, type HomeCategory } from "@/components/CategoryGrid";
import { HomeCategorySection, type HomeSection } from "@/components/HomeCategorySection";
import { HomeBannerRow, type HomeBanner } from "@/components/HomeBannerRow";
import { TestimonialsCarousel, type Testimonial } from "@/components/TestimonialsCarousel";
import { GalleryMasonry, type GalleryImage } from "@/components/GalleryMasonry";
import { TrendingShopProducts, type TrendingShopProduct } from "@/components/TrendingShopProducts";

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

async function getHomeGalleryImages(): Promise<GalleryImage[]> {
  const res = await fetch(`${API_BASE}/gallery?homeOnly=true`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data : [];
}

async function getTrendingShopProducts(): Promise<TrendingShopProduct[]> {
  const res = await fetch(`${API_BASE}/shop/products?featured=true&limit=10`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data.items : [];
}

export default async function Home() {
  const [feed, testimonials, categories, galleryImages, trendingProducts] = await Promise.all([
    getHomeFeed(),
    getTestimonials(),
    getHomeCategories(),
    getHomeGalleryImages(),
    getTrendingShopProducts(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-(--surface-warm,#FFF9F2) py-8 sm:py-12">
          <BannerCarousel placement="HOME_HERO" />
        </section>

        <CategoryGrid categories={categories} />

        <TrendingShopProducts products={trendingProducts} />

        {feed.map((row) =>
          row.type === "section" ? (
            <HomeCategorySection key={`section-${row.data.id}`} section={row.data} />
          ) : (
            <HomeBannerRow key={`banner-${row.data.id}`} banner={row.data} />
          )
        )}

        <TestimonialsCarousel testimonials={testimonials} />

        {galleryImages.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
                  Our Work
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-(--navy-800) sm:text-2xl">Gallery</h2>
              </div>
              <Link href="/gallery" className="font-heading text-sm font-semibold text-accent hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-6">
              <GalleryMasonry images={galleryImages} />
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
