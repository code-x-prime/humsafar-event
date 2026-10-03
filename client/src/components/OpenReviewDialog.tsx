"use client";

import { useState } from "react";
import { Star, X, Loader2, CheckCircle2 } from "lucide-react";
import { postJson, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface OpenReviewDialogProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  // "/reviews/open" for decoration products, "/shop/reviews/open" for Shop With Us.
  endpoint: string;
}

const MIN_COMMENT = 10;

// Review form shown from a product page. Anyone can use it — no login or
// purchase needed — and the review is held for admin approval, so the success
// message says it won't show up straight away.
export function OpenReviewDialog({ open, onClose, productId, endpoint }: OpenReviewDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  // Honeypot — invisible to people, bots tend to fill every field.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  // A logged-in customer's name is filled in for them, but they can change it.
  const nameValue = name || user?.name || "";

  function handleClose() {
    onClose();
    // Reset after the success screen so reopening starts fresh.
    if (submitted) {
      setSubmitted(false);
      setName("");
      setCity("");
      setRating(5);
      setTitle("");
      setComment("");
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nameValue.trim().length < 2) return setError("Please enter your name.");
    if (comment.trim().length < MIN_COMMENT) return setError(`Please write at least ${MIN_COMMENT} characters about your experience.`);

    setSubmitting(true);
    try {
      await postJson(endpoint, {
        productId,
        reviewerName: nameValue.trim(),
        reviewerCity: city.trim() || undefined,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        website,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Write a review"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-primary">Write a review</h2>
            <p className="font-sans text-xs text-(--ink-500)">Share your experience with other customers.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded-full bg-(--surface-alt,#F7F9FC) p-2 text-(--ink-700)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="mt-6 flex flex-col items-center gap-2 pb-2 text-center">
            <CheckCircle2 className="h-10 w-10 text-(--success,#15803D)" />
            <p className="font-heading text-sm font-semibold text-(--navy-800)">Thank you for your review!</p>
            <p className="font-sans text-xs text-(--ink-500)">
              Our team will check it, and it will appear on this page once it&apos;s approved.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 rounded-full bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="flex justify-center gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star
                    className={`h-8 w-8 ${n <= (hoverRating || rating) ? "fill-(--orange-500) text-(--orange-500)" : "text-(--ink-300)"}`}
                  />
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                placeholder="Your name *"
                value={nameValue}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                autoComplete="name"
                className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
              />
              <input
                placeholder="City (optional)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={80}
                className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
              />
            </div>

            <input
              placeholder="Headline (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
            />
            <textarea
              placeholder="Tell us about your experience *"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
            />

            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />

            {error && <p className="font-sans text-xs text-(--coral-600)">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 font-heading text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Review
            </button>
            <p className="text-center font-sans text-[11px] text-(--ink-500)">Reviews are shown after approval by our team.</p>
          </form>
        )}
      </div>
    </div>
  );
}
