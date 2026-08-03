import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePost } from "@/app/actions/content";
import { requireAdmin } from "@/lib/auth/dal";
import { formatPostDate } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import PostForm from "./PostForm";

export const dynamic = "force-dynamic";

/**
 * Blog admin. One route handles the list, the new-post form and editing, keyed
 * off `?edit=` / `?new=` — three near-identical pages would be three places to
 * keep the same form in sync.
 *
 * Drafts are visible here and nowhere else: the "admin read all" policy on
 * `posts` is what makes that work, so this reads with the admin's own client
 * rather than the service role.
 */
export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; new?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { edit, new: isNew, saved } = await searchParams;

  const supabase = await createClient();

  if (isNew) {
    return (
      <Editor title="New post">
        <PostForm />
      </Editor>
    );
  }

  if (edit) {
    const { data: post } = await supabase
      .from("posts")
      .select("*")
      .eq("id", edit)
      .maybeSingle();

    if (!post) notFound();

    return (
      <Editor title="Edit post">
        <PostForm post={post} />
        <form action={deletePost} className="mt-10 border-t border-line pt-6">
          <input type="hidden" name="id" value={post.id} />
          <button type="submit" className="btn btn-outline">
            Delete post
          </button>
        </form>
      </Editor>
    );
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    // Drafts first — they are the ones that need attention.
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="display-sm text-[1.75rem] text-ink">Blog</h1>
          {saved && (
            <p role="status" className="mt-2 text-[0.875rem] text-muted">
              Saved.
            </p>
          )}
        </div>
        <Link href="/admin/blog?new=1" className="btn btn-solid">
          New post
        </Link>
      </div>

      {!posts || posts.length === 0 ? (
        <p className="mt-10 text-[0.9375rem] text-muted">
          No posts yet.
        </p>
      ) : (
        <ul className="mt-10">
          {posts.map((post) => {
            const scheduled =
              post.published_at && new Date(post.published_at) > new Date();
            return (
              <li
                key={post.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-line py-5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/blog?edit=${post.id}`}
                    className="text-[1.0625rem] text-ink hover:opacity-70"
                  >
                    {post.title}
                  </Link>
                  <p className="numeric mt-1 text-[0.8125rem] text-faint">
                    /blog/{post.slug}
                  </p>
                </div>
                <span className="label text-faint">
                  {!post.published_at
                    ? "Draft"
                    : scheduled
                      ? `Scheduled ${formatPostDate(post.published_at)}`
                      : formatPostDate(post.published_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Editor({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Link href="/admin/blog" className="link label inline-flex items-center gap-2">
        <span aria-hidden="true">&larr;</span>
        All posts
      </Link>
      <h1 className="display-sm mt-6 text-[1.75rem] text-ink">{title}</h1>
      <div className="mt-10 max-w-2xl">{children}</div>
    </>
  );
}
