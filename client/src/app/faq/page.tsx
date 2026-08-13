import type { Metadata } from "next";
import { FaqPageContent } from "@/components/FaqPageContent";

export const metadata: Metadata = {
  title: "FAQs | Humsafar Events",
  description: "Answers to common questions about booking, delivery & setup, payments, customisation, cancellations and your account at Humsafar Events.",
};

export default function FaqPage() {
  return <FaqPageContent />;
}
