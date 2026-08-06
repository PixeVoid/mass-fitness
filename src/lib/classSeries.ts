import type { FitnessClass } from "@/lib/db-types";

/**
 * Folds a flat class list into single classes and repeating routines.
 *
 * The admin schedule is one list of every class ever created. A six-week
 * Mon/Wed/Fri routine is eighteen rows in it, which buries everything else —
 * so sessions sharing a `series_id` collapse into one entry that opens.
 *
 * `now` is a parameter rather than a clock read at the call site, for two
 * reasons: a component that calls `Date.now()` during render is impure and the
 * compiler says so, and the "how many are left" count is exactly the sort of
 * arithmetic that is worth a test.
 */

export interface ClassSeries {
  id: string;
  title: string;
  /** Every session, earliest first. */
  sessions: FitnessClass[];
  /** Sessions still to come and not called off — what "cancel the rest" hits. */
  upcoming: number;
}

export type ScheduleEntry =
  | { kind: "single"; item: FitnessClass }
  | { kind: "series"; series: ClassSeries };

export function groupClassSeries(
  classes: readonly FitnessClass[],
  /** Injectable for tests; defaults to now, like `classWindow`. */
  nowMs: number = Date.now(),
): ScheduleEntry[] {
  const byId = new Map<string, ClassSeries>();
  // Order is preserved from the input, so a series appears where its first
  // session would have — the list does not reshuffle when one gets a series.
  const layout: ScheduleEntry[] = [];

  for (const item of classes) {
    if (!item.series_id) {
      layout.push({ kind: "single", item });
      continue;
    }

    const existing = byId.get(item.series_id);
    if (existing) {
      existing.sessions.push(item);
      continue;
    }

    const series: ClassSeries = {
      id: item.series_id,
      title: item.title,
      sessions: [item],
      upcoming: 0,
    };
    byId.set(item.series_id, series);
    layout.push({ kind: "series", series });
  }

  for (const series of byId.values()) {
    // The input is newest-first; a routine reads as a timetable, so within a
    // series it runs forwards.
    series.sessions.sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    );

    series.upcoming = series.sessions.filter(
      (session) =>
        new Date(session.scheduled_at).getTime() > nowMs &&
        session.status !== "cancelled" &&
        session.status !== "ended",
    ).length;
  }

  return layout;
}
