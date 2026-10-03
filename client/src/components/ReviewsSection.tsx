"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { MapPin, Star } from "lucide-react";

// Shared by the decoration and Shop With Us product pages — both return reviews
// in this shape, so one component renders the rating summary and review list.
export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  adminReply: string | null;
  createdAt: string;
  // Set on reviews an admin added by hand; they win over the owning user's name.
  reviewerName?: string | null;
  reviewerCity?: string | null;
  user: { name: string | null };
  media: { url: string; type: string }[];
}

const PAGE_SIZE = 5;

const AVATAR_TINTS = [
  "bg-[#E8F0FE] text-[#1B3F6E]",
  "bg-[#E6F4EA] text-[#15803D]",
  "bg-(--orange-50,#FFF4E8) text-(--orange-600)",
  "bg-(--coral-100) text-(--coral-600)",
];

function avatarTint(name: string) {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return AVATAR_TINTS[sum % AVATAR_TINTS.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ReviewsSection({
  reviews,
  avgRating,
  reviewCount,
}: {
  reviews: PublicReview[];
  avgRating: string;
  reviewCount: number;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [lightbox, setLightbox] = useState<{ slides: { src: string }[]; index: number } | null>(null);

  if (reviews.length === 0) return null;

  // Bars are computed from the reviews actually loaded — never fabricated.
  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const total = Math.max(reviewCount, reviews.length);
  const average = Number(avgRating) || reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section
      id="reviews"
      aria-label="Customer reviews"
      className="mt-8 rounded-(--radius-card,16px) border border-(--ink-100) bg-white p-4 sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--orange-50,#FFF4E8)">
          <Star className="h-4.5 w-4.5 text-(--orange-500)" />
        </span>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Customer reviews</h2>
      </div>

      <div className="mt-4 flex flex-col gap-5 rounded-2xl border border-(--success,#15803D)/15 bg-(--success,#15803D)/5 p-4 sm:flex-row sm:items-center sm:gap-8 sm:p-5">
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-4xl font-bold text-(--navy-800)">{average.toFixed(1)}</span>
            <Star className="h-6 w-6 fill-(--orange-500) text-(--orange-500)" />
          </div>
          <p className="mt-0.5 font-sans text-xs text-(--ink-500)">out of 5</p>
          <p className="mt-1 font-heading text-sm font-semibold text-(--navy-800)">
            {total} review{total === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          {starCounts.map(({ star, count }) => {
            const pct = Math.round((count / reviews.length) * 100);
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="flex w-6 shrink-0 items-center gap-0.5 font-sans text-xs text-(--ink-700)">
                  {star}
                  <Star className="h-2.5 w-2.5 fill-(--ink-500) text-(--ink-500)" />
                </span>
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-white"
                  role="progressbar"
                  aria-label={`${star} star reviews`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full rounded-full bg-(--success,#15803D)" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-9 shrink-0 text-right font-sans text-xs text-(--ink-500)">{pct}%</span>
              </div>
            );
          })}
          {reviews.length < total && (
            <p className="mt-1 font-sans text-[11px] text-(--ink-500)">
              Based on {reviews.length} available review{reviews.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-(--success,#15803D)/40 bg-(--success,#15803D)/5 px-3 py-1.5 font-heading text-xs font-semibold text-(--navy-800)">
        All reviews
        <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] text-(--ink-700)">{reviews.length}</span>
      </span>

      <div className="mt-2">
        {reviews.slice(0, visible).map((review) => {
          const name = review.reviewerName || review.user.name || "Verified Customer";
          const images = review.media.slice(0, 5);
          const goodRating = review.rating >= 4;

          return (
            <article key={review.id} className="flex gap-3 border-t border-(--ink-100) py-4 first:border-t-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-semibold ${avatarTint(name)}`}
                aria-hidden
              >
                {name.trim().charAt(0).toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-heading text-sm font-semibold text-(--navy-800)">{name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-sans text-xs text-(--ink-500)">
                      {review.reviewerCity && (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {review.reviewerCity}
                        </span>
                      )}
                      <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-heading text-xs font-semibold ${
                      goodRating ? "bg-(--success,#15803D) text-white" : "bg-(--orange-50,#FFF4E8) text-(--orange-600)"
                    }`}
                    aria-label={`Rated ${review.rating} out of 5`}
                  >
                    <Star className="h-3 w-3 fill-current" />
                    {review.rating}.0
                  </span>
                </div>

                {review.title && <p className="mt-2 font-heading text-sm font-semibold text-(--navy-800)">{review.title}</p>}
                {review.comment && <p className="mt-1 font-sans text-sm leading-relaxed text-(--ink-700)">{review.comment}</p>}

                {images.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {images.map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`View photo ${i + 1} from ${name}`}
                        onClick={() => setLightbox({ slides: images.map((img) => ({ src: img.url })), index: i })}
                        className="h-16 w-16 overflow-hidden rounded-lg border border-(--ink-100) sm:h-20 sm:w-20"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
                      </button>
                    ))}
                  </div>
                )}

                {review.adminReply && (
                  <div className="mt-2.5 rounded-lg bg-(--surface-alt,#F7F9FC) p-3">
                    <p className="font-heading text-xs font-semibold text-(--blue-600)">Response from Humsafar Events</p>
                    <p className="mt-1 font-sans text-xs text-(--ink-700)">{review.adminReply}</p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {visible < reviews.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="mt-2 w-full rounded-lg border border-(--ink-300) py-2.5 font-heading text-sm font-semibold text-(--navy-800) hover:border-(--orange-600) hover:text-(--orange-600)"
        >
          Show more reviews ({reviews.length - visible})
        </button>
      )}

      {lightbox && (
        <Lightbox
          open
          index={lightbox.index}
          close={() => setLightbox(null)}
          slides={lightbox.slides}
          plugins={[Zoom]}
        />
      )}
    </section>
  );
}
