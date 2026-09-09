import type { Metadata } from "next";
import { ContactPageContent } from "@/components/ContactPageContent";

export const metadata: Metadata = {
  title: "Contact Us | Humsafar Events",
  description: "Questions about a booking, a custom theme, or delivery? Reach Humsafar Events by WhatsApp, call, or email — we typically reply within a few hours.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContactPageContent />;
}
