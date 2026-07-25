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
    <div className="relative flex h-full w-full flex-col p-2 [zoom:0.76] sm:p-4 sm:[zoom:1] lg:p-6">
      <div className="flex w-full items-center justify-between">
        <span className="label flex items-center gap-2.5 text-faint">
          <span className="live-dot" aria-hidden="true" />
          {eyebrow}
        </span>
        <span className="label numeric text-faint">
          {String(index).padStart(2, "0")} / 05
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 items-center gap-6 py-3 sm:mt-auto sm:mb-auto lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col items-start lg:col-span-5">
          <h2 className="display text-[1.625rem] text-ink sm:text-[2.75rem] lg:text-[3.25rem]">
            {title}
          </h2>

          <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted sm:mt-6">
            {body}
          </p>

          <div className="mt-6 sm:mt-9">{action}</div>
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
 *
 * The inner screen is a grid rather than a flex column: in the scroll-stack,
 * one Phone stays mounted for several stages and its screens are passed in
 * as siblings stacked in the same grid cell, cross-fading in place instead
 * of the whole device sliding off and a new one sliding in.
 *
 * Sizing steps up by breakpoint: on mobile the copy column stacks above the
 * phone in the same fixed-height sticky panel, so that block is anchored to
 * the top rather than centered (see CardFrame/StackScrollContainer) — that's
 * what leaves the phone room to be sized prominently instead of just filling
 * whatever space centering left over. From sm up there's a two-column layout
 * with even more room, so it grows further there.
 */
export function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="relative aspect-[9/17] h-[clamp(280px,58vh,460px)] mx-auto shrink-0 rounded-[2.5rem] border border-line-strong bg-paper p-2.5 shadow-[var(--shadow-soft)] sm:h-[clamp(360px,58vh,520px)] sm:mx-0 sm:rounded-[3rem] lg:h-[clamp(400px,66vh,680px)]">
      {/* The screen markup (FitnessJourneyScreen and siblings) uses fixed
          type/padding sizes tuned to read well at the sm+ bezel size. Rather
          than a second, separately-tuned set of mobile-only sizes for every
          screen, zoom the whole thing down together on the smaller mobile
          bezel — it's a static mockup, nothing inside is a real control, so
          shrinking it doesn't touch any tap target. */}
      <div className="grid h-full w-full overflow-hidden rounded-[2rem] border border-line bg-paper [zoom:0.7] sm:rounded-[2.5rem] sm:[zoom:1]">
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
