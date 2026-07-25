import type { CSSProperties } from "react";
import { BoltIcon, StarIcon, TrophyIcon, UsersIcon } from "./icons";

const STATS = [
  { value: "12,400", label: "Members training", icon: UsersIcon },
  { value: "40", label: "Live classes weekly", icon: BoltIcon },
  { value: "15", label: "Years coaching", icon: TrophyIcon },
  { value: "4.9", label: "Average rating", icon: StarIcon },
];

/**
 * Proof row. Hairlines and a small line icon per stat — no boxes, no fills;
 * the numbers still carry it.
 */
export default function StatRow() {
  return (
    <section
      aria-label="Mass Fitness by the numbers"
      className="mx-auto w-full max-w-[1400px] px-5 pt-24 sm:px-8 sm:pt-32 lg:px-12"
    >
      <dl className="grid grid-cols-2 border-t border-line lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            data-reveal=""
            style={{ "--reveal-delay": `${i * 70}ms` } as CSSProperties}
            className="border-b border-line py-7 pr-6 lg:border-b-0 lg:py-9"
          >
            <dt className="sr-only">{stat.label}</dt>
            <dd>
              <span className="block h-5 w-5 text-faint">
                <stat.icon />
              </span>
              <span className="numeric mt-4 block text-3xl tracking-tight text-ink sm:text-4xl">
                {stat.value}
              </span>
              <span className="label mt-3 block text-faint">{stat.label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
