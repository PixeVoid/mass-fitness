"use server";

import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Uploading an image for a post.
 *
 * A Server Action rather than a signed direct-to-storage upload because the
 * checks below have to happen somewhere the browser cannot skip, and there is
 * nothing here worth the extra round trip of minting a signed URL first.
 *
 * The type check does not trust `file.type` alone. That field is whatever the
 * browser was told by the OS, and the OS was told by the file extension — so
 * it is a hint, not a fact. The magic bytes are what the file actually is, and
 * the two must agree before anything is written.
 */

export interface UploadState {
  error?: string;
  url?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

/** Extension by container signature, keyed on what we are willing to serve. */
const SIGNATURES: { ext: string; mime: string; test: (b: Uint8Array) => boolean }[] = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    mime: "image/png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    // RIFF....WEBP — the format tag sits at byte 8, after the size field.
    ext: "webp",
    mime: "image/webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  {
    // ISO-BMFF: "ftyp" at byte 4, then the brand. AVIF and its sequence form.
    ext: "avif",
    mime: "image/avif",
    test: (b) =>
      b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 &&
      b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66,
  },
];

export async function uploadPostImage(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick an image first." };
  }

  if (file.size > MAX_BYTES) {
    return { error: "That image is over 5 MB. Export it smaller." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const match = SIGNATURES.find((signature) => signature.test(bytes));

  if (!match) {
    return { error: "That isn't a JPEG, PNG, WebP or AVIF." };
  }

  // The stored name comes from us, never from the upload. A filename is
  // attacker-controlled text that ends up in a URL — a path separator or a
  // leading dot in it is a way out of the prefix it was meant to stay in.
  const path = `posts/${new Date().getFullYear()}/${randomUUID()}.${match.ext}`;

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, bytes, {
      contentType: match.mime,
      // Cached hard because the name is a uuid: this exact path can never
      // hold different bytes later, so there is nothing to revalidate.
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    console.error("[uploads] post image failed", error);
    // The bucket is created by migration 0011, and this is the failure an
    // admin will actually hit — worth naming rather than "try again".
    return {
      error: error.message.toLowerCase().includes("bucket")
        ? "The post-images bucket is missing — run migration 0011."
        : "Couldn't upload that image.",
    };
  }

  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return { url: data.publicUrl };
}
