import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const metadata: Metadata = {
  title: "Terms & Conditions | Humsafar Events",
  description: "Terms and conditions for booking event decoration services with Humsafar Events.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms & Conditions" updated="8 August 2026">
      <section>
        <p>
          By booking a service through humsafarevent.com, you agree to the terms below. Please read
          them carefully before placing an order.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Service Area</h2>
        <p className="mt-2">
          We currently deliver decoration services in Delhi NCR, Chandigarh, and Jaipur. Availability
          is confirmed by pincode at checkout — booking outside a serviceable area is not possible.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Booking &amp; Payment</h2>
        <p className="mt-2">
          Orders require either full payment or an advance payment at checkout, depending on the
          package. Balance amounts, where applicable, are due before setup begins. All prices shown
          are final at the time of checkout unless a coupon or manual adjustment applies.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Setup &amp; Timing</h2>
        <p className="mt-2">
          Bookings require a minimum lead time before the event slot to allow us to prepare materials
          and schedule staff. Our team will arrive within the confirmed time window; exact setup
          duration depends on the package selected.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Cancellations &amp; Refunds</h2>
        <p className="mt-2">
          Cancellation eligibility and refund amounts are governed by our{" "}
          <Link href="/refund-policy" className="font-medium text-(--blue-600) hover:underline">
            Refund &amp; Cancellation Policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Customer Responsibilities</h2>
        <p className="mt-2">
          Please ensure the delivery address, venue access, and event date/time provided at checkout
          are accurate. Delays caused by incorrect address details or restricted venue access are not
          the responsibility of Humsafar Events.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Limitation of Liability</h2>
        <p className="mt-2">
          Humsafar Events is not liable for delays or issues caused by events outside our reasonable
          control (severe weather, venue restrictions, government orders). In such cases, we will work
          with you to reschedule wherever possible.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Contact</h2>
        <p className="mt-2">
          Questions about these terms? Reach us at{" "}
          <a href="tel:+919899899150" className="font-medium text-(--blue-600) hover:underline">
            +91 98998 99150
          </a>{" "}
          or{" "}
          <a href="mailto:deepakjaat17@yahoo.com" className="font-medium text-(--blue-600) hover:underline">
            deepakjaat17@yahoo.com
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
