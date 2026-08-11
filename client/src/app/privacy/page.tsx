import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | Humsafar Events",
  description: "How Humsafar Events collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" updated="8 August 2026">
      <section>
        <p>
          Humsafar Events (&quot;we&quot;, &quot;us&quot;) operates humsafarevent.com. This policy
          explains what information we collect when you use our site and book our services, and how
          we use it.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Information We Collect</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>Your name, phone number, and email address when you sign in or place an order.</li>
          <li>Your delivery address and event date/time when you book a decoration package.</li>
          <li>Payment confirmation details from our payment partner (we never store your card or UPI details ourselves).</li>
          <li>Basic usage data (pages visited, city selected) to keep the site working correctly.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">How We Use It</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>To verify your identity via one-time password (OTP) sent to your phone.</li>
          <li>To confirm, schedule, and deliver your booking.</li>
          <li>To send order updates and, if needed, event reminders by email or phone.</li>
          <li>To respond to support requests and enquiries.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">How We Protect It</h2>
        <p className="mt-2">
          Passwords and one-time codes are stored in encrypted/hashed form, never as plain text.
          Sensitive account credentials are never shared with third parties. We use industry-standard
          encryption for data in transit (HTTPS) and for storage of sensitive configuration.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Third Parties</h2>
        <p className="mt-2">
          We share only what&apos;s necessary with our payment gateway to process your payment, and
          with our email provider to send order confirmations. We do not sell your personal
          information to anyone.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Your Choices</h2>
        <p className="mt-2">
          You can request a copy of the data we hold about you, or ask us to delete your account, by
          contacting{" "}
          <a href="mailto:deepakjaat17@yahoo.com" className="font-medium text-(--blue-600) hover:underline">
            deepakjaat17@yahoo.com
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-(--navy-800)">Contact</h2>
        <p className="mt-2">
          Questions about this policy? Reach us at{" "}
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
