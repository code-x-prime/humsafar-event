import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export function LegalPageLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-(--surface-alt,#F7F9FC)">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">{title}</h1>
          <p className="mt-2 font-sans text-sm text-(--ink-500)">Last updated: {updated}</p>

          <div className="prose-legal mt-8 space-y-6 rounded-(--radius-card,16px) bg-white p-6 font-sans text-sm leading-7 text-(--ink-700) sm:p-8">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
