"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * The error boundary, which the app did not have.
 *
 * Without one, anything thrown while rendering a route — a Supabase outage
 * mid-query, a missing env var on a fresh deploy — showed Next's stock
 * "Application error: a server-side exception has occurred", on a white page,
 * with a digest string and no way out. On a paid product that reads as the
 * site being gone.
 *
 * `reset()` re-renders the segment. Worth offering because a good share of
 * what lands here is transient: a dropped connection, a token that expired
 * between two reads. It costs one click to find out.
 *
 * Deliberately no `error.message`. On the server Next replaces it with a
 * generic string and a digest anyway, and showing the raw message from a
 * client-side throw risks putting a query or an internal path on screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on which server-side error this was, so it
    // goes to the logs where it can be matched up.
    console.error("[error boundary]", error.digest ?? "", error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-[700px] flex-col justify-center px-5 py-20 sm:px-8">
      <p className="label text-faint">Something went wrong</p>
      <h1 className="display mt-5 text-[2.25rem] text-ink sm:text-[3rem]">
        That didn&rsquo;t <em>load.</em>
      </h1>
      <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-muted">
        Something failed on our side, not yours. Trying again often works — if
        it doesn&rsquo;t, the site itself is fine and you can carry on
        elsewhere.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="btn btn-solid">
          Try again
        </button>
        <Link href="/" className="btn btn-outline">
          Back to the site
        </Link>
      </div>

      {error.digest && (
        <p className="numeric mt-10 text-[0.75rem] text-faint">
          Reference: {error.digest}
        </p>
      )}
    </main>
  );
}
