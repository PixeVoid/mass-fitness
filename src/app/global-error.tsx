"use client";

import { useEffect } from "react";

/**
 * The last resort: an error thrown by the root layout itself.
 *
 * `error.tsx` sits *inside* the layout, so it cannot catch a failure in the
 * layout that would have rendered it. This one replaces the whole document,
 * which is why it has to supply its own `<html>` and `<body>` — and why it
 * cannot use the site's fonts or components, since none of them have been
 * mounted at this point.
 *
 * Consequently it is styled inline and monochrome. This should be seen by
 * nobody; it exists so that if it ever is, it is a sentence rather than a
 * blank screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2rem",
          background: "#0e0e0e",
          color: "#f2f1ee",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", fontWeight: 400, margin: 0 }}>
          Mass Fitness is temporarily unavailable
        </h1>
        <p style={{ maxWidth: "34rem", lineHeight: 1.6, color: "#9a9a9a" }}>
          Something failed before the page could load. Reloading usually fixes
          it. If it keeps happening, we already know — the error is logged.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            alignSelf: "flex-start",
            marginTop: "1.5rem",
            padding: "0.75rem 1.5rem",
            borderRadius: "999px",
            border: "1px solid #f2f1ee",
            background: "transparent",
            color: "#f2f1ee",
            fontSize: "0.9375rem",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
