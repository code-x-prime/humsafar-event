"use client";

import { useRef, useState } from "react";
import { Star, X, Loader2, CheckCircle2, ImagePlus } from "lucide-react";
import { postJson, postForm, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface OpenReviewDialogProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  // "/reviews/open" for decoration products, "/shop/reviews/open" for Shop With Us.
  endpoint: string;
}

interface UploadedPhoto {
  r2Key: string;
  url: string;
}

const MIN_COMMENT = 10;
const MAX_PHOTOS = 5;
const MAX_SIDE = 1600;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Phone cameras produce 4–10 MB photos, which would be slow to upload and can
// exceed the server's 5 MB limit. Big photos are shrunk in the browser first;
// if anything about that fails, the original file is sent as-is.
async function preparePhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    // JPEG has no transparency — paint white first so transparent PNGs don't go black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.\w+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Review form shown from a product page. Anyone can use it — no login or
// purchase needed — and the review is held for admin approval, so the success
// message says it won't show up straight away.
export function OpenReviewDialog({ open, onClose, productId, endpoint }: OpenReviewDialogProps) {
  const { user } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  // Honeypot — invisible to people, bots tend to fill every field.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  // A logged-in customer's name is filled in for them, but they can change it.
  const nameValue = name || user?.name || "";
  const slotsLeft = MAX_PHOTOS - photos.length - uploading;

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
      setPhotos([]);
    }
    setError(null);
  }

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setError(null);

    const accepted = files.filter((f) => ACCEPTED_TYPES.includes(f.type));
    const batch = accepted.slice(0, Math.max(0, slotsLeft));

    if (accepted.length < files.length) setError("Only JPG, PNG or WebP photos can be added.");
    else if (batch.length < accepted.length) setError(`You can add up to ${MAX_PHOTOS} photos.`);
    if (batch.length === 0) return;

    setUploading((n) => n + batch.length);
    for (const file of batch) {
      try {
        const prepared = await preparePhoto(file);
        const formData = new FormData();
        formData.append("file", prepared);
        const uploaded = await postForm<UploadedPhoto>("/reviews/upload-image", formData);
        setPhotos((prev) => [...prev, uploaded]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not upload a photo. Please try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nameValue.trim().length < 2) return setError("Please enter your name.");
    if (comment.trim().length < MIN_COMMENT) return setError(`Please write at least ${MIN_COMMENT} characters about your experience.`);
    if (uploading > 0) return setError("Please wait for your photos to finish uploading.");

    setSubmitting(true);
    try {
      await postJson(endpoint, {
        productId,
        reviewerName: nameValue.trim(),
        reviewerCity: city.trim() || undefined,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        media: photos.length > 0 ? photos.map((p) => ({ r2Key: p.r2Key })) : undefined,
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
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
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
              onChange={(e) => {
                setComment(e.target.value);
                setError(null);
              }}
              rows={4}
              maxLength={2000}
              className="rounded-lg border border-(--ink-300) px-3 py-2 font-sans text-sm outline-none focus:border-(--blue-600)"
            />

            <div>
              <p className="font-heading text-xs font-semibold text-(--navy-800)">
                Photos <span className="font-sans font-normal text-(--ink-500)">(optional, up to {MAX_PHOTOS})</span>
              </p>

              {(photos.length > 0 || uploading > 0) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((photo) => (
                    <div key={photo.r2Key} className="relative h-16 w-16">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt="Your review photo" className="h-16 w-16 rounded-lg border border-(--ink-100) object-cover" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => setPhotos((prev) => prev.filter((p) => p.r2Key !== photo.r2Key))}
                        className="absolute -right-1.5 -top-1.5 rounded-full border-2 border-white bg-(--coral-600) p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {Array.from({ length: uploading }).map((_, i) => (
                    <div
                      key={`uploading-${i}`}
                      className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-(--ink-300) bg-(--surface-alt,#F7F9FC)"
                    >
                      <Loader2 className="h-5 w-5 animate-spin text-(--ink-500)" />
                    </div>
                  ))}
                </div>
              )}

              {slotsLeft > 0 && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  className={`mt-2 flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-4 text-center transition-colors ${
                    dragOver ? "border-(--blue-600) bg-(--surface-alt,#F7F9FC)" : "border-(--ink-300) hover:border-(--blue-600)"
                  }`}
                >
                  <ImagePlus className="h-5 w-5 text-(--ink-500)" />
                  <span className="font-sans text-xs font-medium text-(--ink-700)">Drag &amp; drop or tap to add photos</span>
                  <span className="font-sans text-[11px] text-(--ink-500)">
                    {slotsLeft} left · JPG, PNG or WebP
                  </span>
                </button>
              )}

              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                aria-label="Add review photos"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  // Lets the same file be picked again after removing it.
                  e.target.value = "";
                }}
              />
            </div>

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
              disabled={submitting || uploading > 0}
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
