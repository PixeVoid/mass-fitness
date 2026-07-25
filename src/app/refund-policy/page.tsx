import type { Metadata } from "next";
import { LegalPage, Section, Callout, List } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Mass Fitness Refund Policy — all sales are final. Please read our no-refund policy carefully before purchasing any fitness programme or membership.",
  robots: { index: true, follow: true },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy" meta="Last updated: January 2026 · Effective date: August 2025">
      <Callout>
        <strong className="text-ink">Important:</strong> At Mass Fitness, all sales are final and we do not offer refunds. By purchasing any programme, membership, or service, you acknowledge and agree to this policy.
      </Callout>

      <Section index="01" title="No cancellation">
        <p>
          Once a programme is purchased and confirmed, it cannot be cancelled under any circumstances. This applies to Group Training, One-to-One Personalized Training, Squad Training, 90-Day Transformation Programmes, and any membership subscription.
        </p>
      </Section>

      <Section index="02" title="No refunds">
        <p>All payments for training programmes, diet plans, or memberships are non-refundable, including in cases of:</p>
        <List
          items={[
            "Personal reasons or change of mind",
            "Change of schedule or inability to attend sessions",
            "Lack of participation or engagement with the programme",
            "Technical issues on the client's end",
            "Medical conditions (unless prior written notification was provided before purchase)",
          ]}
        />
      </Section>

      <Section index="03" title="Non-transferable">
        <p>
          Fees and programme access are non-transferable. You may not transfer your programme access, sessions, or membership to another individual under any circumstances.
        </p>
      </Section>

      <Section index="04" title="Programme commitment">
        <p>
          By enrolling, you are making a commitment to your fitness journey. Our trainers are committed to supporting your progress — we ask that you reciprocate with commitment.
        </p>
      </Section>

      <Section index="05" title="Support in genuine difficulty">
        <p>While cancellations and refunds aren&rsquo;t permitted, we may — entirely at our discretion — offer:</p>
        <List
          items={[
            "Session rescheduling within the programme validity period",
            "Alternate workout guidance suited to your temporary limitations",
            "Temporary programme pause (up to 7 days, subject to approval)",
          ]}
        />
        <p className="text-sm text-faint pt-1">
          These accommodations do not constitute a right to refund or cancellation, and are granted entirely at our discretion.
        </p>
      </Section>

      <Section index="06" title="Disputes">
        <p>
          Please contact our support team before raising a dispute — we&rsquo;re committed to resolving issues through direct communication. Disputes are governed by the laws of India and subject to the jurisdiction of courts in India.
        </p>
      </Section>

      <Section index="07" title="Contact">
        <List
          items={[
            "Email: fitnessbymass@gmail.com",
            "WhatsApp: +91 62075 24549",
            "Address: Sardar Patel Colony, Patna, Bihar, India",
          ]}
        />
      </Section>
    </LegalPage>
  );
}
