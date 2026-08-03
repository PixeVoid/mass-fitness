import type { Plan } from "@/lib/plans";

const siteUrl = "https://massfitness.in";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Mass Fitness",
  url: siteUrl,
  logo: `${siteUrl}/logo/mf-mark-square.png`,
  slogan: "Your Body. Your Goals. Our Commitment.",
  description:
    "Live online fitness classes and structured home workout plans, coach-led and streamed in real time.",
  email: "fitnessbymass@gmail.com",
  telephone: "+91-6207524549",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Sardar Patel Colony",
    addressLocality: "Patna",
    addressRegion: "Bihar",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.instagram.com/massfitness.in/",
    "https://www.facebook.com/massfitness.in",
    "https://www.youtube.com/@MassFitness-f4k",
  ],
};

const OFFER_NAMES: Record<string, string> = {
  group: "Group Training",
  one_to_one: "One-to-One Personalized Training",
};

/** Prices are admin-editable (src/lib/pricing.ts), so this schema is built
 * from the same monthly catalogue the pricing section renders — never a
 * hardcoded figure that could drift from what's actually charged. */
function buildServiceSchema(monthlyPlans: Plan[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Online fitness training",
    provider: {
      "@type": "Organization",
      name: "Mass Fitness",
    },
    areaServed: "IN",
    offers: monthlyPlans.map((plan) => ({
      "@type": "Offer",
      name: OFFER_NAMES[plan.tier] ?? plan.label,
      price: String(Math.round(plan.amountPaise / 100)),
      priceCurrency: "INR",
      category: "Subscription — per month",
    })),
  };
}

export function StructuredData({ monthlyPlans }: { monthlyPlans: Plan[] }) {
  const serviceSchema = buildServiceSchema(monthlyPlans);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
    </>
  );
}
