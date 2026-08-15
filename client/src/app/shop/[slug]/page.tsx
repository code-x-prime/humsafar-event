import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShopProductDetail, type ShopProductDetailData } from "@/components/ShopProductDetail";
import { RelatedShopProducts } from "@/components/RelatedShopProducts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getProduct(slug: string): Promise<ShopProductDetailData | null> {
  const res = await fetch(`${API_BASE}/shop/products/${slug}`, { cache: "no-store" });
  if (res.status === 404) return null;
  const json = await res.json();
  return json.success ? json.data : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found | Humsafar Events" };
  return {
    title: product.metaTitle || `${product.title} | Shop With Us`,
    description: product.metaDescription || product.shortDescription || undefined,
  };
}

export default async function ShopProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-(--surface-alt,#F7F9FC)">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
          <ShopProductDetail product={product} />
          <RelatedShopProducts slug={product.slug} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
