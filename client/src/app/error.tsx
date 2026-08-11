"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-(--surface-alt,#F7F9FC) px-4 text-center">
      <p className="font-display text-xl font-semibold text-primary">Something went wrong</p>
      <p className="max-w-sm font-sans text-sm text-(--ink-500)">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-primary px-6 py-2.5 font-heading text-sm font-semibold text-primary-foreground"
      >
        Try Again
      </button>
    </div>
  );
}
