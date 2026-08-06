import type { MetadataRoute } from "next";

const siteUrl = "https://massfitness.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/live",
        "/api",
        "/admin",
        "/coach",
        "/login",
        "/onboarding",
        "/auth/callback",
        // Checkout and the group picker are behind auth and carry noindex; the
        // previous entry here was "/subscribe/callback", a route that has never
        // existed — the return page is /subscribe/return.
        "/subscribe",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
