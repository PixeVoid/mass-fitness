"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPostImage } from "@/app/actions/uploads";

/**
 * Picks a file, uploads it, and hands back a URL.
 *
 * Calls the action directly rather than being a `<form action={…}>`, because
 * this sits *inside* the post form and HTML forbids nested forms — React will
 * render them, the browser will not, and the inner one silently submits the
 * outer one instead. Building the FormData by hand sidesteps the whole
 * question.
 *
 * The upload is deliberately its own step and not part of saving the post: an
 * image has to exist at a URL before the post body can reference it, so
 * folding the two together would mean either two round trips pretending to be
 * one, or a half-saved post when the second failed.
 */
export default function ImageUploader({
  label,
  buttonLabel = "Upload",
  onUploaded,
}: {
  label: string;
  buttonLabel?: string;
  /** Called with the public URL once the file is stored. */
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);

      const result = await uploadPostImage({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) {
        onUploaded(result.url);
        // Clear the picker so the same file is not uploaded twice by a second
        // click on a button that still looks armed.
        if (inputRef.current) inputRef.current.value = "";
        setFileName(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="field-label">{label}</p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(event) =>
            setFileName(event.target.files?.[0]?.name ?? null)
          }
          className="block max-w-full text-[0.8125rem] text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border file:border-line-strong file:bg-transparent file:px-4 file:py-2 file:text-[0.8125rem] file:text-ink hover:file:bg-overlay"
        />
        <button
          type="button"
          onClick={upload}
          disabled={!fileName || pending}
          className="btn btn-outline !py-2 !text-[0.8125rem] disabled:opacity-50"
        >
          {pending ? "Uploading…" : buttonLabel}
        </button>
      </div>

      <p className="text-[0.75rem] text-faint">
        JPEG, PNG, WebP or AVIF. Up to 5 MB.
      </p>

      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
