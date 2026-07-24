import type { CSSProperties } from "react";

const STATS = [
  { value: "12,400", label: "Members training" },
  { value: "40", label: "Live classes weekly" },
  { value: "15", label: "Years coaching" },
  { value: "4.9", label: "Average rating" },
];

/**
 * Proof row. Hairlines only — the numbers carry it, so boxing them would just
 * add furniture.
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
              <span className="numeric block text-3xl tracking-tight text-ink sm:text-4xl">
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
