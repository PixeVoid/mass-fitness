import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/content";

const siteUrl = "https://massfitness.in";

/**
 * Only real, indexable routes.
 *
 * The previous version listed /pricing and /contact, neither of which exists —
 * pricing and contact are sections of the homepage. A sitemap full of 404s is
 * worse than a short one: it is the file a crawler treats as our own statement
 * of what we have, and being wrong there costs crawl budget and trust.
 *
 * Everything behind auth (dashboard, subscribe, live, admin) is deliberately
 * absent, and each of those pages also carries robots: noindex.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${siteUrl}/assessment`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms-and-conditions`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/refund-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/disclaimer`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Posts carry their own lastModified, which is the field that actually makes
  // a sitemap worth having — it is how a crawler knows an old URL changed.
  const posts = await getPublishedPosts();

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
