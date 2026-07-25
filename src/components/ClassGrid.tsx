import {
  BoltIcon,
  DumbbellIcon,
  HeartPulseIcon,
  StretchIcon,
} from "./icons";

const CLASSES = [
  {
    name: "Strength",
    duration: "45 min",
    kit: "Dumbbells",
    level: "All levels",
    blurb: "Progressive overload on the compound patterns — squat, hinge, push, pull.",
    icon: DumbbellIcon,
  },
  {
    name: "HIIT",
    duration: "30 min",
    kit: "No equipment",
    level: "Intermediate",
    blurb: "Short work windows, high density. The fastest conditioning stimulus we run.",
    icon: BoltIcon,
  },
  {
    name: "Mobility",
    duration: "25 min",
    kit: "Mat only",
    level: "All levels",
    blurb: "Hips, thoracic spine, ankles. The session that keeps the other three available.",
    icon: StretchIcon,
  },
  {
    name: "Conditioning",
    duration: "40 min",
    kit: "Optional bands",
    level: "All levels",
    blurb: "Aerobic base plus intervals — the engine everything else runs on.",
    icon: HeartPulseIcon,
  },
];

/**
 * A schedule reads better as a list than as a grid of tiles: it lets the eye
 * run down one column of names and compare durations without re-scanning.
 */
export default function ClassGrid() {
  return (
    <ul className="mt-16 sm:mt-20">
      {CLASSES.map((item) => (
        <li key={item.name} data-reveal="">
          <a
            href="#pricing"
            className="group grid grid-cols-1 items-baseline gap-x-8 gap-y-4 border-t border-line py-8 transition-colors duration-500 hover:bg-overlay sm:py-10 lg:grid-cols-12"
          >
            <div className="flex items-center gap-4 self-center lg:col-span-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface-sunk text-muted transition-colors duration-500 group-hover:border-line-strong group-hover:text-ink"
              >
                <span className="block h-5 w-5">
                  <item.icon />
                </span>
              </span>
              <h3 className="display-sm text-[1.75rem] text-ink transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5 sm:text-[2.125rem]">
                {item.name}
              </h3>
            </div>

            <p className="max-w-sm text-[0.9375rem] leading-relaxed text-muted lg:col-span-5">
              {item.blurb}
            </p>

            <div className="label flex flex-wrap items-center gap-x-5 gap-y-2 text-faint lg:col-span-3 lg:justify-end">
              <span className="numeric">{item.duration}</span>
              <span>{item.kit}</span>
              <span
                aria-hidden="true"
                className="hidden transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1 lg:inline"
              >
                &rarr;
              </span>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
