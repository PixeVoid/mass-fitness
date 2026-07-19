const siteUrl = "https://massfitness.app";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Mass Fitness",
  url: siteUrl,
  slogan: "Fitness From Home",
  description:
    "Live online fitness classes and structured home workout plans, coach-led and streamed in real time.",
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
      name: "Monthly plan",
      priceCurrency: "INR",
      category: "Subscription",
    },
    {
      "@type": "Offer",
      name: "Quarterly plan",
      priceCurrency: "INR",
      category: "Subscription",
    },
    {
      "@type": "Offer",
      name: "Annual plan",
      priceCurrency: "INR",
      category: "Subscription",
    },
  ],
};

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
    </>
  );
}
