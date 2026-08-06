import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import { isSafeImageSrc } from "@/components/blog/Markdown";
import { formatPostDate, getPublishedPosts, readingTime } from "@/lib/content";

export const metadata: Metadata = {
  title: "Training journal",
  description:
    "Home training, programming and nutrition, written by the coaches who run Mass Fitness classes. Practical guidance for training without a gym.",
  alternates: { canonical: "/blog" },
};

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-[900px] px-5 pb-24 sm:px-8 sm:pb-32">
        <HeaderSpacer />

        <p className="label text-faint">Journal</p>
        <h1 className="display mt-5 text-[2.5rem] text-ink sm:text-[3.25rem]">
          Training, written down.
        </h1>
        <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
          What we actually tell members — programming, form, and the parts of
          nutrition that matter when you train at home.
        </p>

        {posts.length === 0 ? (
          <p className="mt-20 border-t border-line pt-10 text-[0.9375rem] leading-relaxed text-muted">
            Nothing published yet. The first pieces are being written.
          </p>
        ) : (
          <ul className="mt-20">
            {posts.map((post) => (
              <li key={post.id} className="border-t border-line">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group grid grid-cols-1 gap-x-8 gap-y-4 py-8 sm:grid-cols-[1fr_auto] sm:py-10"
                >
                  <div className="flex flex-col gap-3">
                  <div className="label flex flex-wrap items-center gap-x-4 gap-y-2 text-faint">
                    {post.published_at && (
                      <span className="numeric">
                        {formatPostDate(post.published_at)}
                      </span>
                    )}
                    <span className="numeric">{readingTime(post.body)}</span>
                  </div>

                  <h2 className="display-sm max-w-2xl text-[1.5rem] text-ink transition-opacity duration-300 group-hover:opacity-70 sm:text-[1.875rem]">
                    {post.title}
                  </h2>

                  {post.excerpt && (
                    <p className="max-w-xl text-[0.9375rem] leading-relaxed text-muted">
                      {post.excerpt}
                    </p>
                  )}
                  </div>

                  {/* A thumbnail, not a hero: the index is a list you scan,
                      and a full-width image per row turns it into a feed. */}
                  {post.cover_image_url && isSafeImageSrc(post.cover_image_url) && (
                    // An author can point a cover at any host; next/image
                    // needs each one configured up front.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-40 w-full rounded-xl border border-line object-cover transition-opacity duration-300 group-hover:opacity-80 sm:h-28 sm:w-44"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Footer />
    </>
  );
}
