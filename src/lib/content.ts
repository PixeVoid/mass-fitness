import "server-only";

import { cache } from "react";
import type { Faq, Post } from "@/lib/db-types";
import { createClient } from "@/lib/supabase/server";

/**
 * Blog and FAQ reads.
 *
 * Both tables are publicly readable under RLS with a `published` predicate, so
 * these use the request's own anon-key client — the policy is the filter, and
 * a draft is invisible to an anonymous reader at the database rather than
 * because a `.eq()` was remembered. The `published_at` conditions below are
 * belt to that braces, and they also express *scheduled* posts, which the
 * policy allows for but a listing should not show early.
 *
 * Every one of these is wrapped in `cache()`: a post page asks for the same
 * row twice, once for `generateMetadata` and once to render.
 */

export const getPublishedPosts = cache(async (): Promise<Post[]> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select("*")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });

    return data ?? [];
  } catch {
    // No Supabase configured yet — an empty blog is a better failure than a
    // 500 on a page that is otherwise static marketing.
    return [];
  }
});

export const getPostBySlug = cache(
  async (slug: string): Promise<Post | null> => {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("slug", slug)
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .maybeSingle();

      return data ?? null;
    } catch {
      return null;
    }
  },
);

export const getPublishedFaqs = cache(async (): Promise<Faq[]> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("faqs")
      .select("*")
      .eq("published", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    return data ?? [];
  } catch {
    return [];
  }
});

/** Groups FAQs by category, preserving the hand-set order within each. */
export function groupFaqs(faqs: Faq[]): { category: string; items: Faq[] }[] {
  const groups: { category: string; items: Faq[] }[] = [];

  for (const faq of faqs) {
    const existing = groups.find((g) => g.category === faq.category);
    if (existing) existing.items.push(faq);
    else groups.push({ category: faq.category, items: [faq] });
  }

  return groups;
}

/** "3 min read" — 200 words a minute, rounded up, never zero. */
export function readingTime(body: string): string {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

export function postDescription(post: Post): string {
  return (
    post.seo_description ??
    post.excerpt ??
    `${post.body.replace(/[#*_>`\-]/g, "").trim().slice(0, 155)}…`
  );
}

/** "12 August 2026" — long form, since a blog date is read, not scanned. */
export function formatPostDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}
