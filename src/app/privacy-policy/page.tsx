import type { Metadata } from "next";
import { LegalPage, Section, List } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Mass Fitness Privacy Policy — learn how we collect, use, and protect your personal information on massfitness.in.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" meta="Last updated: January 2026 · Effective date: August 2025">
      <p className="text-[15px] text-white/55 leading-relaxed mb-10">
        This Privacy Policy governs how Mass Fitness (operated by Siddhant Sawan, registered at Sardar Patel Colony, Patna, Bihar) collects, uses, maintains, and discloses information from users of massfitness.in and the Mass Fitness application.
      </p>

      <Section index="01" title="Information we collect">
        <p>We may collect the following when you make a purchase, create an account, or contact us:</p>
        <List
          items={[
            "Name, email address, and phone number",
            "Billing / shipping address",
            "Payment information (processed securely via third-party payment gateways)",
            "Health and fitness goals you voluntarily provide",
            "Browser type, operating system, and browsing behaviour (non-personal)",
          ]}
        />
      </Section>

      <Section index="02" title="How we use your information">
        <List
          items={[
            "To process and fulfil your programme enrolment or order",
            "To send order confirmations, updates, and training materials",
            "To respond to customer service enquiries",
            "To send promotional emails if you have opted in (unsubscribe at any time)",
            "To analyse user behaviour and improve our platform experience",
            "To personalise the workout and diet plans assigned to you",
          ]}
        />
      </Section>

      <Section index="03" title="Information sharing">
        <p>
          We do not sell, trade, or rent your personal information. We may share information with trusted third-party service providers who help operate our website, process payments, and deliver services — subject to confidentiality agreements — or when required by law.
        </p>
      </Section>

      <Section index="04" title="Data security">
        <p>
          We use appropriate technical and organisational measures to protect your data from unauthorised access, alteration, disclosure, or destruction. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>
      </Section>

      <Section index="05" title="Your rights">
        <List
          items={[
            "Access and update your personal information by contacting us directly",
            "Opt out of promotional emails at any time via the unsubscribe link",
            "Request deletion of your personal data (subject to legal obligations)",
          ]}
        />
      </Section>

      <Section index="06" title="Cookies">
        <p>
          Our website may use cookies to enhance user experience. You may set your browser to refuse cookies, though some features may not function properly as a result.
        </p>
      </Section>

      <Section index="07" title="Children&rsquo;s privacy">
        <p>
          Our services are not directed at individuals under 18. We do not knowingly collect personal information from minors — clients under 18 require written parent or guardian consent before enrolling.
        </p>
      </Section>

      <Section index="08" title="Changes to this policy">
        <p>
          We may update this Privacy Policy at any time. Changes will be posted here with an updated revision date. Continued use of the platform constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section index="09" title="Governing law">
        <p>
          This Privacy Policy is governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts of India.
        </p>
      </Section>
    </LegalPage>
  );
}
