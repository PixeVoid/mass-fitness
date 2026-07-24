import type { ReactNode } from "react";

/**
 * Shared chrome for every card in the scroll stack: the mono eyebrow, the step
 * counter, the copy column and the captioned visual. Previously each card
 * repeated all of this inline, which is how the five drifted out of alignment.
 */
export default function CardFrame({
  eyebrow,
  index,
  title,
  body,
  action,
  visualLabel,
  children,
}: {
  eyebrow: string;
  index: number;
  title: ReactNode;
  body: string;
  action: ReactNode;
  /** Short caption naming what the visual actually shows. */
  visualLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full w-full flex-col p-2 sm:p-4 lg:p-6">
      <div className="flex w-full items-center justify-between">
        <span className="label flex items-center gap-2.5 text-faint">
          <span className="live-dot" aria-hidden="true" />
          {eyebrow}
        </span>
        <span className="label numeric text-faint">
          {String(index).padStart(2, "0")} / 05
        </span>
      </div>

      <div className="my-auto grid grid-cols-1 items-center gap-10 py-6 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col items-start lg:col-span-5">
          <h2 className="display text-[2rem] text-ink sm:text-[2.75rem] lg:text-[3.25rem]">
            {title}
          </h2>

          <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-muted">
            {body}
          </p>

          <div className="mt-9">{action}</div>
        </div>

        <div className="relative flex flex-col items-center gap-5 lg:col-span-7">
          <div className="relative flex w-full items-center justify-center">
            {children}
          </div>
          {/* Names what the mockup is, so the visual isn't left to be guessed at. */}
          <p className="label text-center text-faint">{visualLabel}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * The phone mockup the product cards share.
 *
 * A real handset ratio (9:17) rather than the exaggerated 9:18.5 it had, which
 * read as a sliver rather than a device. Height is clamped against the
 * viewport and width is derived from the aspect ratio, so it can never
 * overflow the sticky frame on a short laptop — a fixed pixel height would
 * spill out below ~760px tall.
 */
export function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="relative aspect-[9/17] h-[clamp(320px,56vh,560px)] shrink-0 rounded-[2.5rem] border border-line-strong bg-paper p-2.5 shadow-[var(--shadow-soft)] sm:rounded-[2.75rem]">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-line bg-paper px-4 pb-4 pt-4 sm:rounded-[2.25rem]">
        {children}
      </div>
    </div>
  );
}

/** A small inset row inside the phone screen. */
export function Row({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-sunk px-3.5 py-3 ${className}`}
    >
      {children}
    </div>
  );
}
