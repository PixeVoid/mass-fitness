/**
 * Streamed while the dashboard's queries run.
 *
 * The shape deliberately matches the real page — heading, membership block,
 * class list — so the swap is a fill rather than a relayout. Its whole job is
 * to make the click on the account pill respond instantly; without it Next has
 * nothing to show for the segment and the browser sits on the previous page
 * until the server has finished, which is what read as the app hanging.
 */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your dashboard…</span>

      <div className="skeleton h-3 w-24 rounded-full" />
      <div className="skeleton mt-6 h-11 w-[min(28rem,80%)] rounded-lg" />

      <section className="mt-14 border-t border-line pt-8 sm:mt-20">
        <div className="skeleton h-3 w-28 rounded-full" />
        <div className="skeleton mt-6 h-5 w-[min(22rem,90%)] rounded-md" />
        <div className="skeleton mt-3 h-5 w-[min(16rem,70%)] rounded-md" />
      </section>

      <section className="mt-14 border-t border-line pt-8 sm:mt-20">
        <div className="skeleton h-3 w-36 rounded-full" />
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="grid grid-cols-1 items-baseline gap-x-8 gap-y-3 border-t border-line py-6 first:border-t-0 sm:py-8 lg:grid-cols-12"
          >
            <div className="lg:col-span-5">
              <div className="skeleton h-6 w-[min(15rem,80%)] rounded-md" />
              <div className="skeleton mt-3 h-4 w-28 rounded-md" />
            </div>
            <div className="lg:col-span-4">
              <div className="skeleton h-3 w-40 rounded-full" />
            </div>
            <div className="lg:col-span-3 lg:justify-self-end">
              <div className="skeleton h-11 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
