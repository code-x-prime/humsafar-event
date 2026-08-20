import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Humsafar Events",
  description:
    "Humsafar Events refund and cancellation policy — full refund if cancelled 24 hours before the event, 50% refund within 24 hours.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout title="Refund & Cancellation Policy" updated="8 August 2026">
      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Cancellation Window</h2>
        <p className="mt-2">
          We understand plans can change. Our refund policy is simple and based on how much notice
          you give us before your scheduled event date and time slot.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Refund Amounts</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold text-(--navy-800)">More than 24 hours before the event:</span>{" "}
            you receive a <span className="font-semibold text-(--coral-600)">100% (full) refund</span> of
            the amount paid.
          </li>
          <li>
            <span className="font-semibold text-(--navy-800)">Within 24 hours of the event:</span> you
            receive a <span className="font-semibold text-(--coral-600)">50% refund</span> of the amount
            paid, since materials and staff are already committed for your setup by this time.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">How to Cancel</h2>
        <p className="mt-2">
          Call or WhatsApp us at{" "}
          <a href="tel:+919899899150" className="font-medium text-(--blue-600) hover:underline">
            +91 98998 99150
          </a>{" "}
          or email{" "}
          <a href="mailto:humsafarevent010@gmail.com" className="font-medium text-(--blue-600) hover:underline">
            humsafarevent010@gmail.com
          </a>{" "}
          with your order number, and we&apos;ll confirm your cancellation and refund amount right away.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Refund Timeline</h2>
        <p className="mt-2">
          Approved refunds are processed to your original payment method within 5–7 business days,
          depending on your bank or payment provider.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Non-Refundable Situations</h2>
        <p className="mt-2">
          Once our team has arrived at your venue and setup has begun, the order is no longer eligible
          for a refund. If we are unable to deliver due to an error on our part, you will receive a
          full refund regardless of timing.
        </p>
      </section>
    </LegalPageLayout>
  );
}
