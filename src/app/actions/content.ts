"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Blog and FAQ editing (/admin/blog, /admin/faq).
 *
 * Uses the admin's own client, not the service role: `posts` and `faqs` both
 * carry an "admin write" RLS policy, so the database re-verifies the caller
 * rather than taking this file's word for it. Same pattern as
 * `actions/pricing.ts`.
 *
 * `requireAdmin()` is still the first line of every one of these. A Server
 * Action is a public endpoint, and the fact that only an admin page renders
 * the form that posts to it protects nothing.
 */

export interface ContentState {
  error?: string;
  success?: string;
}

/**
 * Lowercase, hyphenated, no leading or trailing hyphen. Slugs end up in URLs
 * that are meant to outlive the post's title, so they are validated rather
 * than silently coerced — an author who typed something odd should be told.
 */
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Slug needs at least 3 characters.")
  .max(80, "Slug is too long.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug can use lowercase letters, numbers and single hyphens only.",
  );

const postSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  slug: slugSchema,
  title: z.string().trim().min(3, "Give it a title.").max(160),
  excerpt: z.string().trim().max(320).optional().or(z.literal("")),
  body: z.string().trim().min(1, "The post is empty.").max(60_000),
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(180).optional().or(z.literal("")),
  publish: z.string().optional(),
});

export async function savePost(
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  const admin = await requireAdmin();

  const parsed = postSchema.safeParse({
    id: formData.get("id") ?? "",
    slug: formData.get("slug"),
    title: formData.get("title"),
    excerpt: formData.get("excerpt") ?? "",
    body: formData.get("body"),
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    publish: formData.get("publish") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const { id, slug, title, excerpt, body, seoTitle, seoDescription, publish } =
    parsed.data;

  const supabase = await createClient();

  // Publishing sets the date once and never moves it — a re-save of a live
  // post must not restamp it to today and reorder the whole index.
  let publishedAt: string | null = null;
  if (publish) {
    const existing = id
      ? await supabase
          .from("posts")
          .select("published_at")
          .eq("id", id)
          .maybeSingle()
      : null;
    publishedAt = existing?.data?.published_at ?? new Date().toISOString();
  }

  const row = {
    slug,
    title,
    excerpt: excerpt || null,
    body,
    seo_title: seoTitle || null,
    seo_description: seoDescription || null,
    published_at: publishedAt,
    author_id: admin.id,
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("posts").update(row).eq("id", id)
    : await supabase.from("posts").insert(row);

  if (error) {
    // 23505 is the unique violation on `slug` — by far the likeliest failure
    // here, and the one with an answer the author can act on.
    return {
      error:
        error.code === "23505"
          ? "That slug is already used by another post."
          : "Couldn't save the post.",
    };
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/blog");
  redirect("/admin/blog?saved=1");
}

export async function deletePost(formData: FormData) {
  await requireAdmin();

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/admin/blog");

  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", id.data);

  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  redirect("/admin/blog?deleted=1");
}

const faqSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  question: z.string().trim().min(5, "Write the question out in full.").max(200),
  answer: z.string().trim().min(5, "The answer is too short.").max(2000),
  category: z.string().trim().min(1).max(40),
  position: z.coerce.number().int().min(0).max(9999),
  published: z.string().optional(),
});

export async function saveFaq(
  _prev: ContentState,
  formData: FormData,
): Promise<ContentState> {
  await requireAdmin();

  const parsed = faqSchema.safeParse({
    id: formData.get("id") ?? "",
    question: formData.get("question"),
    answer: formData.get("answer"),
    category: formData.get("category") ?? "General",
    position: formData.get("position") ?? 0,
    published: formData.get("published") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  }

  const { id, question, answer, category, position, published } = parsed.data;
  const supabase = await createClient();

  const row = {
    question,
    answer,
    category,
    position,
    published: Boolean(published),
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("faqs").update(row).eq("id", id)
    : await supabase.from("faqs").insert(row);

  if (error) return { error: "Couldn't save that question." };

  revalidatePath("/faq");
  revalidatePath("/admin/faq");
  return { success: id ? "Updated." : "Added." };
}

export async function deleteFaq(formData: FormData) {
  await requireAdmin();

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/admin/faq");

  const supabase = await createClient();
  await supabase.from("faqs").delete().eq("id", id.data);

  revalidatePath("/faq");
  redirect("/admin/faq");
}
