"use client";

import { useState } from "react";
import { Star, X, Loader2 } from "lucide-react";
import { postJson, ApiError } from "@/lib/api";

interface WriteReviewDialogProps {
  orderId: string;
  productId: string;
  productTitle: string;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export function WriteReviewDialog({ orderId, productId, productTitle, open, onClose, onSubmitted }: WriteReviewDialogProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postJson("/reviews", { orderId, productId, rating, title: title || undefined, comment: comment || undefined });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your review. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-primary">Write a Review</h2>
            <p className="font-sans text-xs text-(--ink-500)">{productTitle}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-(--surface-alt,#F7F9FC) p-2 text-(--ink-700)">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <Star
                  className={`h-8 w-8 ${
                    n <= (hoverRating || rating) ? "fill-(--orange-500) text-(--orange-500)" : "text-(--ink-300)"
                  }`}
                />
              </button>
            ))}
          </div>

          <input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
          />
          <textarea
            placeholder="Tell us about your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
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
        </form>
      </div>
    </div>
  );
}
