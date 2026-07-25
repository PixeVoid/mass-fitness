import type { Metadata } from "next";
import { LegalPage, Section, List } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Mass Fitness Terms and Conditions — understand your rights and obligations when using our online fitness platform, programmes, and services.",
  robots: { index: true, follow: true },
};

export default function TermsAndConditionsPage() {
  return (
    <LegalPage title="Terms & Conditions" meta="Last updated: January 2026 · Effective date: August 2025">
      <p className="text-[15px] text-muted leading-relaxed mb-10">
        This document is an electronic record under the Information Technology Act, 2000 and does not require a physical or digital signature. The Platform is owned and operated by{" "}
        <strong className="text-ink">Siddhant Sawan</strong>, registered at{" "}
        <strong className="text-ink">Sardar Patel Colony, Patna, Bihar, India</strong>. By using massfitness.in (the &ldquo;Platform&rdquo;), you agree to the terms below.
      </p>

      <Section index="01" title="Eligibility">
        <List
          items={[
            "You must be at least 18 years of age to enrol in any programme",
            "Clients under 18 require written parental or guardian consent",
            "By using the Platform, you confirm that all information provided is accurate and truthful",
          ]}
        />
      </Section>

      <Section index="02" title="Services">
        <p>Mass Fitness provides online fitness coaching services including:</p>
        <List
          items={[
            "Group Training — personalised gym and home workout programmes (₹1,499/month)",
            "One-to-One Personalized Training — fully customised gym and home training (₹2,999/month)",
            "Squad Training — group training for 2 or more people (₹1,199/month per person)",
            "90-Day Transformation Programme",
            "Personalised diet plans, live online classes, and an on-demand workout library",
          ]}
        />
      </Section>

      <Section index="03" title="Health & safety">
        <List
          items={[
            "Consult a qualified physician before starting any programme",
            "Mass Fitness is not liable for injuries, health issues, or adverse effects arising from training",
            "You participate in all physical activities at your own risk",
            "Stop immediately and seek medical advice if you experience pain, dizziness, or discomfort",
          ]}
        />
      </Section>

      <Section index="04" title="No cancellation / no refund">
        <p>All sales are final. Please read this carefully before making a purchase.</p>
        <List
          items={[
            "Once a programme is purchased and confirmed, it cannot be cancelled under any circumstances",
            "All payments are non-refundable, regardless of personal reasons, schedule change, or lack of participation",
            "Fees are non-transferable to other individuals or programmes",
            "In cases of genuine difficulty, we may offer session rescheduling at our discretion — this does not constitute a refund",
          ]}
        />
      </Section>

      <Section index="05" title="Code of conduct">
        <List
          items={[
            "Clients must maintain respectful behaviour towards trainers and fellow members",
            "Abusive, disruptive, or threatening behaviour may result in immediate termination without refund",
            "Harassment of any kind will not be tolerated",
          ]}
        />
      </Section>

      <Section index="06" title="Intellectual property">
        <p>
          All workout plans, diet charts, and training materials are the intellectual property of the platform owner. Sharing, reselling, or redistributing content without written permission is prohibited and may result in legal action.
        </p>
      </Section>

      <Section index="07" title="Limitation of liability">
        <p>
          You are ultimately responsible for your own safety. Mass Fitness and its trainers are not liable for injury, illness, or accident arising from training or diet plans. Total liability will not exceed the fees paid for the relevant programme.
        </p>
      </Section>

      <Section index="08" title="Indemnification">
        <p>
          You agree to indemnify and hold harmless Mass Fitness, its owner, trainers, and affiliates from claims arising out of your breach of these Terms or violation of any law or third-party right.
        </p>
      </Section>

      <Section index="09" title="Modifications">
        <p>
          Mass Fitness may modify these Terms at any time without prior notice. Continued use of the Platform after changes constitutes acceptance of those changes.
        </p>
      </Section>

      <Section index="10" title="Governing law & jurisdiction">
        <p>
          These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts in India.
        </p>
      </Section>

      <Section index="11" title="Contact">
        <List
          items={[
            "Email: fitnessbymass@gmail.com",
            "WhatsApp: +91 62075 24549",
            "Registered address: Sardar Patel Colony, Patna, Bihar, India",
          ]}
        />
      </Section>
    </LegalPage>
  );
}
