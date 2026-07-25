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

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Online fitness training",
  provider: {
    "@type": "Organization",
    name: "Mass Fitness",
  },
  areaServed: "IN",
  offers: [
    {
      "@type": "Offer",
      name: "Group Training",
      price: "1499",
      priceCurrency: "INR",
      category: "Subscription — per month",
    },
    {
      "@type": "Offer",
      name: "One-to-One Personalized Training",
      price: "2999",
      priceCurrency: "INR",
      category: "Subscription — per month",
    },
    {
      "@type": "Offer",
      name: "Squad Training",
      price: "1199",
      priceCurrency: "INR",
      category: "Subscription — per month, per person, min. 2 participants",
    },
  ],
};

export function StructuredData() {
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
