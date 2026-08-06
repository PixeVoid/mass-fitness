import type { LucideIcon } from "lucide-react";

/**
 * The one place an icon's weight, size and colour are decided.
 *
 * Lucide draws at 24×24 with a stroke of 2; the hand-drawn set already in
 * `components/icons.tsx` uses 1.75. Left alone the two would read as two
 * different icon families on the same page — subtly heavier lines on the
 * admin panel than on the landing page — so everything from lucide is
 * normalised to 1.75 here rather than at each call site, where it would drift
 * the first time someone forgot.
 *
 * Always `aria-hidden`. Every icon in this app sits beside its own label, so
 * announcing it would make a screen reader say everything twice. An icon that
 * ever stands alone needs a label on the control around it, not here.
 */

export type IconSize = "sm" | "md" | "lg";

const SIZES: Record<IconSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export default function Icon({
  glyph: Glyph,
  size = "md",
  className = "",
}: {
  glyph: LucideIcon;
  size?: IconSize;
  className?: string;
}) {
  return (
    <Glyph
      aria-hidden="true"
      strokeWidth={1.75}
      className={`${SIZES[size]} shrink-0 ${className}`}
    />
  );
}

/**
 * A section label with its icon — the `label text-faint` heading used all over
 * the admin, coach and dashboard pages, which were columns of small grey
 * uppercase text with nothing to tell one from another at a glance.
 */
export function IconLabel({
  glyph,
  children,
  className = "",
}: {
  glyph: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`label flex items-center gap-2 text-faint ${className}`}>
      <Icon glyph={glyph} size="sm" />
      {children}
    </span>
  );
}

/**
 * An icon in a bordered circle — the treatment the landing page already uses
 * for its step numbers and plan tiers, lifted so the app pages can share it.
 * Used where an icon is carrying a section rather than annotating a line.
 */
export function IconBadge({
  glyph,
  className = "",
}: {
  glyph: LucideIcon;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-sunk text-muted ${className}`}
    >
      <Icon glyph={glyph} size="md" />
    </span>
  );
}
