"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, ShoppingBag, Truck, CheckCircle2, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { getJson } from "@/lib/api";

interface ShopProductMedia {
  id: string;
  url: string;
  alt: string | null;
  type: "IMAGE" | "VIDEO";
  isPrimary: boolean;
}

interface ShopReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  adminReply: string | null;
  user: { name: string | null };
  media: { url: string; type: string }[];
}

export interface ShopProductDetailData {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  highlights: string[];
  price: string;
  mrp: string | null;
  stock: number;
  shippingInfo: string | null;
  avgRating: string;
  reviewCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  media: ShopProductMedia[];
  categories: { category: { id: string; name: string; slug: string } }[];
  reviews: ShopReview[];
}

function StarRow({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= rating ? "fill-(--orange-500) text-(--orange-500)" : "text-(--ink-300)"}`} />
      ))}
    </div>
  );
}

export function ShopProductDetail({ product }: { product: ShopProductDetailData }) {
  const router = useRouter();
  const { addShopItemToCart } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ whatsappNumber: string }>("/settings/contact")
      .then((data) => setWhatsappNumber(data.whatsappNumber))
      .catch(() => {});
  }, []);

  const images = product.media.length > 0 ? product.media : null;
  const discount =
    product.mrp && Number(product.mrp) > Number(product.price)
      ? Math.round((1 - Number(product.price) / Number(product.mrp)) * 100)
      : null;
  const outOfStock = product.stock <= 0;

  async function handleAddToCart() {
    setAdding(true);
    try {
      await addShopItemToCart(product.id);
      toast.success("Added to cart");
    } catch {
      toast.error("Couldn't add to cart. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleBuyNow() {
    setAdding(true);
    try {
      await addShopItemToCart(product.id);
      router.push("/cart");
    } catch {
      toast.error("Couldn't add to cart. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  const whatsappMessage = `Hi! I'm interested in "${product.title}"${
    typeof window !== "undefined" ? ` — ${window.location.href}` : ""
  }`;

  return (
    <div className="grid grid-cols-1 gap-6 pb-20 lg:grid-cols-[1fr_1fr] lg:pb-0">
      {/* Gallery */}
      <div>
        <div className="relative aspect-square w-full overflow-hidden rounded-(--radius-card,16px) border border-(--ink-100) bg-white">
          {images ? (
            <Image
              src={images[activeImage].url}
              alt={images[activeImage].alt || product.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center font-sans text-sm text-(--ink-500)">
              No image available
            </div>
          )}
        </div>

        {images && images.length > 1 && (
          <div className="mt-3 flex gap-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveImage(i)}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${i === activeImage ? "border-(--blue-600)" : "border-(--ink-100)"}`}
              >
                <Image src={img.url} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info panel */}
      <div>
        {product.categories[0] && (
          <Link href={`/shop?category=${product.categories[0].category.slug}`} className="font-sans text-xs text-(--ink-500) hover:text-accent">
            {product.categories[0].category.name}
          </Link>
        )}

        <h1 className="mt-1 font-display text-2xl font-semibold text-primary sm:text-3xl">{product.title}</h1>

        {product.reviewCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5 font-sans text-sm text-(--ink-700)">
            <span className="flex items-center gap-1 rounded-full bg-(--success,#15803D) px-2 py-0.5 text-xs font-semibold text-white">
              <Star className="h-3 w-3 fill-current" />
              {product.avgRating}
            </span>
            {product.reviewCount} reviews
          </div>
        )}

        {product.shortDescription && (
          <p className="mt-3 font-sans text-sm text-(--ink-700)">{product.shortDescription}</p>
        )}

        <div className="mt-5 flex items-end gap-3">
          <span className="font-heading text-3xl font-semibold text-(--navy-800)">&#8377;{product.price}</span>
          {product.mrp && discount !== null && (
            <>
              <span className="mb-1 font-sans text-sm text-(--ink-500) line-through">&#8377;{product.mrp}</span>
              <span className="mb-1 font-sans text-sm font-semibold text-(--success,#15803D)">{discount}% off</span>
            </>
          )}
        </div>

        {product.highlights.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5">
            {product.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 font-sans text-sm text-(--ink-700)">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-(--success,#15803D)" />
                {h}
              </li>
            ))}
          </ul>
        )}

        {product.shippingInfo && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-(--ink-100) bg-white px-4 py-3">
            <Truck className="h-4 w-4 shrink-0 text-(--orange-600)" />
            <p className="font-sans text-sm text-(--ink-700)">{product.shippingInfo}</p>
          </div>
        )}

        {outOfStock ? (
          <p className="mt-6 font-heading text-sm font-semibold text-(--coral-600)">Out of stock</p>
        ) : (
          <div className="mt-6 hidden gap-3 lg:flex">
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="flex flex-1 items-center justify-center gap-2 rounded-(--radius-btn,12px) border border-primary px-6 py-3 font-heading text-sm font-semibold text-primary disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={adding}
              className="flex flex-1 items-center justify-center gap-2 rounded-(--radius-btn,12px) bg-primary px-6 py-3 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Buy Now
            </button>
          </div>
        )}

        {product.description && (
          <div className="mt-8 rounded-(--radius-card,16px) border border-(--ink-100) bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-(--navy-800)">Description</h2>
            <div
              className="prose prose-sm mt-2 max-w-none font-sans text-sm leading-6 text-(--ink-700)"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        )}

        {/* Reviews */}
        <div className="mt-8 rounded-(--radius-card,16px) border border-(--ink-100) bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-(--navy-800)">Reviews</h2>
          {product.reviews.length === 0 ? (
            <p className="mt-2 font-sans text-sm text-(--ink-500)">No reviews yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              {product.reviews.map((review) => (
                <div key={review.id} className="border-t border-(--ink-100) pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <StarRow rating={review.rating} size="h-3.5 w-3.5" />
                    <span className="font-heading text-xs font-semibold text-(--navy-800)">{review.user.name || "Customer"}</span>
                  </div>
                  {review.title && <p className="mt-1.5 font-heading text-sm font-semibold text-(--navy-800)">{review.title}</p>}
                  {review.comment && <p className="mt-1 font-sans text-sm text-(--ink-700)">{review.comment}</p>}
                  {review.adminReply && (
                    <div className="mt-2 rounded-lg bg-(--surface-alt,#F7F9FC) p-2.5 font-sans text-xs text-(--ink-700)">
                      <span className="font-semibold">Reply from Humsafar Events: </span>
                      {review.adminReply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile-only fixed bottom action bar: WhatsApp circle + Add to Cart pill */}
      {!outOfStock && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-(--ink-100) bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden">
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#25D366] shadow-md"
            >
              <Image src="/whatsapp.png" alt="" width={26} height={26} className="h-6.5 w-6.5" />
            </a>
          )}

          <button
            onClick={handleBuyNow}
            disabled={adding}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 font-heading text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add to Cart"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
