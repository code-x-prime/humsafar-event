import { Star } from "lucide-react";
import type { ProductDetailData } from "@/app/decoration/[slug]/page";

export function ProductReviews({ reviews, avgRating, reviewCount }: { reviews: ProductDetailData["reviews"]; avgRating: string; reviewCount: number }) {
  if (reviews.length === 0) return null;

  // Computed from the actual reviews array — never fabricated.
  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="mt-8 rounded-(--radius-card,16px) border border-(--ink-100) bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-(--navy-800)">Ratings &amp; Reviews</h2>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-start sm:gap-1">
          <span className="font-display text-4xl font-bold text-(--navy-800)">{avgRating}</span>
          <div className="flex flex-col gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-4 w-4 ${n <= Math.round(Number(avgRating)) ? "fill-(--orange-500) text-(--orange-500)" : "text-(--ink-300)"}`}
                />
              ))}
            </div>
            <span className="font-sans text-xs text-(--ink-500)">
              {reviewCount} review{reviewCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          {starCounts.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="w-3 shrink-0 font-sans text-xs text-(--ink-500)">{star}</span>
              <Star className="h-3 w-3 shrink-0 fill-(--orange-500) text-(--orange-500)" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--ink-100)">
                <div
                  className="h-full rounded-full bg-(--orange-500)"
                  style={{ width: reviewCount > 0 ? `${(count / reviewCount) * 100}%` : "0%" }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-sans text-xs text-(--ink-500)">
                {reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-t border-(--ink-100) pt-4 first:border-0 first:pt-0">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-3.5 w-3.5 ${n <= review.rating ? "fill-(--orange-500) text-(--orange-500)" : "text-(--ink-300)"}`}
                  />
                ))}
              </div>
              <span className="font-heading text-xs font-semibold text-(--navy-800)">{review.user.name || "Verified Customer"}</span>
              <span className="font-sans text-[11px] text-(--ink-500)">
                {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>

            {review.title && <p className="mt-1.5 font-heading text-sm font-semibold text-(--navy-800)">{review.title}</p>}
            {review.comment && <p className="mt-1 font-sans text-sm text-(--ink-700)">{review.comment}</p>}

            {review.media.length > 0 && (
              <div className="mt-2 flex gap-2">
                {review.media.map((m, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={m.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                ))}
              </div>
            )}

            {review.adminReply && (
              <div className="mt-2 rounded-lg bg-(--surface-alt,#F7F9FC) p-3">
                <p className="font-heading text-xs font-semibold text-(--blue-600)">Response from Humsafar Events</p>
                <p className="mt-1 font-sans text-xs text-(--ink-700)">{review.adminReply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
