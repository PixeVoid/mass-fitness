import type { Metadata } from "next";
import { LegalPage, Section, Callout, List } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Mass Fitness Disclaimer — all fitness content is for educational purposes only. Consult a physician before starting any exercise or diet programme.",
  robots: { index: true, follow: true },
};

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer" meta="Last updated: January 2026 · Effective date: August 2025">
      <p className="text-[15px] text-muted leading-relaxed mb-10">
        The information provided on massfitness.in — including training programmes, diet plans, fitness tips, workout videos, and all other content — is for{" "}
        <strong className="text-ink">educational and informational purposes only</strong>. Individual results may vary based on effort, body type, medical condition, age, and lifestyle.
      </p>

      <Section index="01" title="Consult a medical professional">
        <p>
          Always consult a physician, doctor, or qualified healthcare provider before starting any exercise programme, diet plan, or fitness routine — especially if you have pre-existing medical conditions, injuries, or are pregnant.
        </p>
      </Section>

      <Section index="02" title="Participation at your own risk">
        <p>
          Participation in any workout, training programme, or diet plan is entirely at your own risk. Mass Fitness, its trainers, and its affiliates are not responsible for any injuries, health issues, or adverse effects that may occur.
        </p>
      </Section>

      <Section index="03" title="Results may vary">
        <p>
          Testimonials and transformation stories shared on our platform are individual experiences and are not guaranteed results. Your results will depend on multiple personal factors including effort, consistency, sleep, stress, and genetics.
        </p>
      </Section>

      <Section index="04" title="Not a medical service">
        <p>
          Mass Fitness is a fitness coaching platform, not a medical service. Our diet plans and training guidance are not a substitute for professional medical advice, diagnosis, or treatment.
        </p>
      </Section>

      <Section index="05" title="Cancellation & refund policy">
        <p>By enrolling in any programme, you agree to the following:</p>
        <List
          items={[
            <span key="1"><strong className="text-ink">No cancellation</strong> — once a programme is purchased and confirmed, it cannot be cancelled under any circumstances.</span>,
            <span key="2"><strong className="text-ink">No refunds</strong> — all payments for training programmes, diet plans, or memberships are non-refundable, including for personal reasons, schedule changes, or lack of participation.</span>,
            <span key="3"><strong className="text-ink">Non-transferable</strong> — programmes are tied to the enrolled individual and cannot be shifted to another person.</span>,
            <span key="4"><strong className="text-ink">Support</strong> — while cancellations and refunds aren&rsquo;t possible, we can help with rescheduling or alternate guidance in cases of genuine difficulty (travel or health issues).</span>,
          ]}
        />
      </Section>

      <Section index="06" title="External links">
        <p>
          Our website may contain links to third-party websites, provided for convenience only. Mass Fitness has no control over the content of those sites and accepts no responsibility for them.
        </p>
      </Section>

      <Section index="07" title="Governing law">
        <p>
          This disclaimer is governed by and construed in accordance with the laws of India, and is subject to the exclusive jurisdiction of the courts in India.
        </p>
      </Section>

      <Callout>
        By using our website, services, or training programmes, you acknowledge and agree to this disclaimer in full.
      </Callout>
    </LegalPage>
  );
}
