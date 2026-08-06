/**
 * Streamed while an admin page's queries run, inside the admin layout's chrome
 * — so the tabs stay put and only the panel below them fills in. Same reason
 * as the dashboard's: every one of these pages is force-dynamic, and without a
 * fallback a tab click looks like nothing happened.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="skeleton h-3 w-32 rounded-full" />
      <div className="mt-8 flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="skeleton h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
