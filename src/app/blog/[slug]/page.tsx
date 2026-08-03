import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import Markdown from "@/components/blog/Markdown";
import {
  formatPostDate,
  getPostBySlug,
  postDescription,
  readingTime,
} from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  // A 404 should not advertise itself as an indexable page.
  if (!post) return { title: "Not found", robots: { index: false } };

  const description = postDescription(post);

  return {
    title: post.seo_title ?? post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seo_title ?? post.title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.published_at ?? undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  // Article structured data. Same reasoning as the landing page's Product
  // markup: a blog that Google can read as an article gets a date, an author
  // and a headline in the result rather than a bare title.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: postDescription(post),
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: "Mass Fitness" },
    publisher: {
      "@type": "Organization",
      name: "Mass Fitness",
      url: "https://massfitness.in",
    },
    mainEntityOfPage: `https://massfitness.in/blog/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8 sm:pb-32">
        <HeaderSpacer />

        <Link href="/blog" className="link label inline-flex items-center gap-2">
          <span aria-hidden="true">&larr;</span>
          All posts
        </Link>

        <h1 className="display mt-10 text-[2.25rem] text-ink sm:text-[3rem]">
          {post.title}
        </h1>

        <div className="label mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-faint">
          {post.published_at && (
            <span className="numeric">{formatPostDate(post.published_at)}</span>
          )}
          <span className="numeric">{readingTime(post.body)}</span>
        </div>

        <div className="mt-16">
          <Markdown body={post.body} />
        </div>

        <div className="mt-20 border-t border-line pt-10">
          <p className="display-sm text-[1.5rem] text-ink">
            Want this coached, not just read?
          </p>
          <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted">
            Live classes run several times a week, with a coach watching your
            form rather than a video playing at you.
          </p>
          <Link href="/subscribe" className="btn btn-solid mt-8">
            See the plans
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
