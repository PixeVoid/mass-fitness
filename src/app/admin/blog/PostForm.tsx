"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { savePost, type ContentState } from "@/app/actions/content";
import type { Post } from "@/lib/db-types";

/**
 * Create/edit form for one post.
 *
 * The slug auto-fills from the title while it is untouched and stops the
 * moment it is edited by hand — a slug that keeps rewriting itself under an
 * author who deliberately set it is worse than one they have to type. On an
 * existing post it never auto-fills at all: the URL is published, and quietly
 * changing it on a title tweak would break every link to the piece.
 */
export default function PostForm({ post }: { post?: Post }) {
  const [state, action] = useActionState<ContentState, FormData>(savePost, {});
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));

  return (
    <form action={action} className="flex flex-col gap-6">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div>
        <label htmlFor="title" className="field-label">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={160}
          defaultValue={post?.title ?? ""}
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className="field"
        />
      </div>

      <div>
        <label htmlFor="slug" className="field-label">
          Slug — /blog/{slug || "…"}
        </label>
        <input
          id="slug"
          name="slug"
          required
          maxLength={80}
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className="field numeric"
        />
      </div>

      <div>
        <label htmlFor="excerpt" className="field-label">
          Excerpt — shown on the index, and used as the meta description
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          maxLength={320}
          defaultValue={post?.excerpt ?? ""}
          className="field resize-y"
        />
      </div>

      <div>
        <label htmlFor="body" className="field-label">
          Body — markdown: ## heading, **bold**, *italic*, - list, &gt; quote,
          [text](url)
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={20}
          maxLength={60_000}
          defaultValue={post?.body ?? ""}
          className="field resize-y font-mono text-[0.875rem]"
        />
      </div>

      <details className="border-t border-line pt-6">
        <summary className="label cursor-pointer text-faint">
          SEO overrides
        </summary>
        <div className="mt-6 flex flex-col gap-6">
          <div>
            <label htmlFor="seoTitle" className="field-label">
              Meta title — defaults to the post title
            </label>
            <input
              id="seoTitle"
              name="seoTitle"
              maxLength={70}
              defaultValue={post?.seo_title ?? ""}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="seoDescription" className="field-label">
              Meta description — defaults to the excerpt
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              maxLength={180}
              defaultValue={post?.seo_description ?? ""}
              className="field resize-y"
            />
          </div>
        </div>
      </details>

      <label className="flex items-center gap-3 border-t border-line pt-6 text-[0.9375rem] text-ink">
        <input
          type="checkbox"
          name="publish"
          value="1"
          defaultChecked={Boolean(post?.published_at)}
          className="h-4 w-4"
        />
        Published — unticked keeps it a draft, visible only here
      </label>

      {state.error && (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      )}

      <SaveButton isNew={!post} />
    </form>
  );
}

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-solid self-start disabled:opacity-60"
    >
      {pending ? "Saving…" : isNew ? "Create post" : "Save changes"}
    </button>
  );
}

/** Mirrors the slug rule the Server Action validates against. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
