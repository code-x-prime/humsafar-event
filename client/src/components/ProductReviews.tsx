import type { ProductDetailData } from "@/app/decoration/[slug]/page";
import { ReviewsSection } from "@/components/ReviewsSection";

// Decoration-page reviews. The markup lives in ReviewsSection so the Shop With
// Us product page shows the exact same review UI.
export function ProductReviews({
  reviews,
  avgRating,
  reviewCount,
}: {
  reviews: ProductDetailData["reviews"];
  avgRating: string;
  reviewCount: number;
}) {
  return <ReviewsSection reviews={reviews} avgRating={avgRating} reviewCount={reviewCount} />;
}
