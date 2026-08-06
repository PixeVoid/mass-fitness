"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { savePost, type ContentState } from "@/app/actions/content";
import ImageUploader from "./ImageUploader";
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
  const [coverUrl, setCoverUrl] = useState(post?.cover_image_url ?? "");
  const [body, setBody] = useState(post?.body ?? "");

  // Where the caret was when the author last touched the body. Inserting an
  // image at the end of the text would be useless — the point is placing it
  // in the paragraph you are writing.
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertIntoBody(markdown: string) {
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody((current) => `${current}\n\n${markdown}\n`);
      return;
    }

    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? start;
    // Its own block: an image sharing a paragraph with text renders inline in
    // the middle of a sentence, which is never what was meant.
    const snippet = `\n\n${markdown}\n\n`;
    const next = body.slice(0, start) + snippet + body.slice(end);

    setBody(next);

    // Put the caret after what was just inserted, so typing continues below
    // the image rather than jumping back to the top of the field.
    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + snippet.length;
      textarea.setSelectionRange(caret, caret);
    });
  }

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

      {/* Cover image. The URL is what gets saved, so a post can also point at
          an image hosted elsewhere without going through the uploader. */}
      <div className="border-t border-line pt-6">
        <label htmlFor="coverImageUrl" className="field-label">
          Cover image — shown on the index and as the social preview
        </label>

        {coverUrl && (
          // The URL is arbitrary at authoring time; next/image needs a
          // configured host, and this preview is admin-only.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="mt-3 max-h-52 w-full rounded-xl border border-line object-cover"
          />
        )}

        <div className="mt-3">
          <ImageUploader label="" onUploaded={setCoverUrl} />
        </div>

        <input
          id="coverImageUrl"
          name="coverImageUrl"
          value={coverUrl}
          onChange={(event) => setCoverUrl(event.target.value)}
          placeholder="Upload below, or paste a URL"
          className="field numeric mt-3 text-[0.8125rem]"
        />

        <div className="mt-3">
          <label htmlFor="coverImageAlt" className="field-label">
            Alt text — what a screen reader says. Leave blank if decorative.
          </label>
          <input
            id="coverImageAlt"
            name="coverImageAlt"
            maxLength={200}
            defaultValue={post?.cover_image_alt ?? ""}
            className="field"
          />
        </div>

        {coverUrl && (
          <button
            type="button"
            onClick={() => setCoverUrl("")}
            className="btn btn-quiet-danger mt-3 !py-2 !text-[0.8125rem]"
          >
            Remove cover
          </button>
        )}
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
          [text](url), ![alt](image-url)
        </label>
        <textarea
          id="body"
          name="body"
          ref={bodyRef}
          required
          rows={20}
          maxLength={60_000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="field resize-y font-mono text-[0.875rem]"
        />

        {/* Places an image where the caret is, rather than appending it. The
            markdown it writes is the same syntax an author can type by hand,
            so nothing here is a special case the renderer has to know about. */}
        <div className="mt-3 rounded-xl border border-line p-4">
          <ImageUploader
            label="Insert an image into the body at the cursor"
            buttonLabel="Insert"
            onUploaded={(url) => insertIntoBody(`![](${url})`)}
          />
          <p className="mt-2 text-[0.75rem] text-faint">
            Add the description between the brackets — <code className="numeric">![a squat at depth](…)</code> — so
            it is read out and indexed.
          </p>
        </div>
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
