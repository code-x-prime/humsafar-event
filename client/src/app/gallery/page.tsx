import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GalleryMasonry, type GalleryImage } from "@/components/GalleryMasonry";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getGalleryImages(): Promise<GalleryImage[]> {
  const res = await fetch(`${API_BASE}/gallery`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data : [];
}

export const metadata = {
  title: "Gallery — Humsafar Events",
};

export default async function GalleryPage() {
  const images = await getGalleryImages();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <div className="border-b border-(--ink-100) bg-(--surface-warm,#FFF9F2) px-4 py-8 text-center sm:py-12">
          <p className="font-heading text-xs font-semibold uppercase tracking-[.18em] text-(--orange-600)">
            Our Work
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-(--navy-800) sm:text-3xl">Gallery</h1>
          <p className="mx-auto mt-2.5 max-w-md font-sans text-sm text-(--ink-500)">
            A look at decorations we&apos;ve brought to life for our customers
          </p>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <GalleryMasonry images={images} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
