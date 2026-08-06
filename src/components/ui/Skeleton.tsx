/**
 * Loading placeholders, shared.
 *
 * Every dynamic route needs a `loading.tsx` or a click on a link does nothing
 * visible until the server has finished rendering — the browser stays on the
 * old page, which reads as the app having hung. Thirteen routes had none.
 *
 * Written once rather than hand-laid-out thirteen times: a skeleton that does
 * not match the page it stands in for causes a visible relayout on arrival,
 * which is worse than no skeleton at all, and matching by hand thirteen times
 * is how that happens.
 */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

/** The small mono label every section starts with. */
export function SkeletonLabel({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-3 rounded-full ${className}`} />;
}

/** A page's title block: eyebrow, heading, standfirst. */
export function SkeletonHeading({ lead = true }: { lead?: boolean }) {
  return (
    <>
      <SkeletonLabel className="w-24" />
      <SkeletonLine className="mt-6 h-10 w-[min(24rem,80%)]" />
      {lead && <SkeletonLine className="mt-5 h-4 w-[min(32rem,90%)]" />}
    </>
  );
}

/**
 * A list of rows — the shape of nearly every page in the app.
 *
 * `aria-hidden` on the rows and one polite announcement on the wrapper: a
 * screen reader should hear "loading" once, not read out eight empty rows.
 */
export function SkeletonRows({
  rows = 4,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`mt-6 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line py-5"
        >
          <div className="min-w-0 flex-1">
            <SkeletonLine className="h-5 w-[min(18rem,70%)]" />
            <SkeletonLine className="mt-2.5 h-3.5 w-32" />
          </div>
          <SkeletonLabel className="w-36" />
        </div>
      ))}
    </div>
  );
}

/** Wraps a loading screen so assistive tech hears one message, not many. */
export function SkeletonScreen({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
