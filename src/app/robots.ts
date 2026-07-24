import type { MetadataRoute } from "next";

const siteUrl = "https://massfitness.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/live", "/api", "/admin", "/subscribe/callback"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
