/**
 * The live room's own loading state.
 *
 * Deliberately not a skeleton. Everything else in the app fills a page shape,
 * but this route is a black full-bleed stage and the wait is a token mint plus
 * a WebRTC handshake — a grey outline of a video player would promise a layout
 * that is about to be replaced wholesale. A line saying what is happening is
 * more honest, and it matches what LiveRoom shows a moment later.
 */
export default function LiveLoading() {
  return (
    <main
      id="main"
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center px-5 py-16"
    >
      <p className="label text-faint">Joining…</p>
    </main>
  );
}
