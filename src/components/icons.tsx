/**
 * Shared line-icon set.
 *
 * These replace the emoji the feature cards used to render. Emoji pick up the
 * OS font, so they arrived in a different colour, weight and vertical rhythm on
 * every platform — the single loudest "unfinished" signal on the page. These
 * inherit `currentColor` and the surrounding stroke weight instead.
 *
 * All icons share a 24x24 box, 1.75 stroke, round caps and joins.
 */

import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

function Svg({
  children,
  className = "",
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-full w-full ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3c.5 2.4-.9 3.6-2.1 4.8C8.4 9.2 7 10.6 7 13.2A5 5 0 0 0 17 13.2c0-2-.7-3.3-1.7-4.6" />
      <path d="M12 20a2.6 2.6 0 0 0 2.6-2.6c0-1.6-1.4-2.3-2.6-4-1.2 1.7-2.6 2.4-2.6 4A2.6 2.6 0 0 0 12 20Z" />
    </Svg>
  );
}

export function DumbbellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 10.5v3M5.5 8v8M18.5 8v8M21.5 10.5v3" />
      <path d="M8.5 7.5v9M15.5 7.5v9" />
      <path d="M8.5 12h7" />
    </Svg>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 2.5 4.5 13.5h6l-.5 8 9-11h-6l.5-8Z" />
    </Svg>
  );
}

export function LeafIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20c0-8 5-13 16-13 0 9-4.5 13-11 13-2.5 0-5-1-5-1Z" />
      <path d="M9.5 15.5 20 7" />
    </Svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 3.5h9v5a4.5 4.5 0 0 1-9 0v-5Z" />
      <path d="M7.5 5H5a2.5 2.5 0 0 0 2.5 2.5M16.5 5H19a2.5 2.5 0 0 1-2.5 2.5" />
      <path d="M12 13v3.5M8.5 20.5h7M9.5 20.5c0-2 1-4 2.5-4s2.5 2 2.5 4" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function PlayIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-full w-full ${className}`}
      aria-hidden="true"
    >
      <path d="M9 6.5v11a.6.6 0 0 0 .93.5l8.2-5.5a.6.6 0 0 0 0-1l-8.2-5.5A.6.6 0 0 0 9 6.5Z" />
    </svg>
  );
}

export function RulerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 15.5 15.5 3.5l5 5-12 12-5-5Z" />
      <path d="M7 12l2 2M10 9l2 2M13 6l2 2" />
    </Svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14.9c2.5.5 4 2.3 4 5.1" />
    </Svg>
  );
}

export function HeartPulseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20.5S3.5 15.2 3.5 9.4A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8.5 1.8c0 5.8-8.5 11.1-8.5 11.1Z" />
      <path d="M3.8 11.5h3.7l1.5-2.5 2 4.5 1.7-3h3.4" />
    </Svg>
  );
}

export function StopwatchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.5l2.2 1.6M9.5 2.5h5M12 2.5v3.5M18.5 7l1.5-1.5" />
    </Svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.6 1-5.7-4.1-4 5.7-.8L12 3.5Z" />
    </Svg>
  );
}

/** Side-bend stretch — used for mobility work, the one class type none of the
 * other icons (strength, HIIT, conditioning) already cover. */
export function StretchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12.5" cy="4.2" r="1.6" />
      <path d="M12.3 6.3v5.2M12.3 8.3l-4 2.6M12.3 7.8l4.8-1.6M12.3 11.5l-3 6.2M12.3 11.5l4 5.4" />
    </Svg>
  );
}
