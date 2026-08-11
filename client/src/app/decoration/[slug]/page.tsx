import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductDetail } from "@/components/ProductDetail";
import { ProductReviews } from "@/components/ProductReviews";
import { RelatedProducts } from "@/components/RelatedProducts";

export interface ProductDetailData {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  inclusions: string[];
  exclusions: string[];
  careInfo: string[];
  deliveryInfo: string | null;
  price: string;
  mrp: string | null;
  setupTimeMinutes: number | null;
  avgRating: string;
  reviewCount: number;
  categories: { category: { name: string; slug: string } }[];
  media: { id: string; type: string; url: string; alt: string | null; isPrimary: boolean }[];
  variants: { id: string; name: string; swatches: string[] }[];
  faqItems: { id: string; question: string; answer: string }[];
  cities: { city: { id: string; name: string; slug: string } }[];
  addOns: {
    addOn: {
      id: string;
      name: string;
      price: string;
      image: string | null;
      category: { id: string; name: string; position: number } | null;
    };
  }[];
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    adminReply: string | null;
    createdAt: string;
    user: { name: string | null };
    media: { url: string; type: string }[];
  }[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getProduct(slug: string): Promise<ProductDetailData | null> {
  const res = await fetch(`${API_BASE}/products/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;

  const json = await res.json();
  return json.success ? json.data : null;
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const category = product.categories[0]?.category;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-(--surface-alt,#F7F9FC)">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          {category && (
            <p className="font-sans text-xs text-(--ink-500)">
              <Link href="/" className="hover:text-accent">Home</Link> /{" "}
              <Link href={`/category/${category.slug}`} className="hover:text-accent">
                {category.name}
              </Link>{" "}
              / {product.title}
            </p>
          )}

          <ProductDetail product={product} />
          <ProductReviews reviews={product.reviews} avgRating={product.avgRating} reviewCount={product.reviewCount} />
          <RelatedProducts slug={product.slug} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
