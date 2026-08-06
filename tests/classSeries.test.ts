import { describe, expect, it } from "vitest";
import { groupClassSeries } from "@/lib/classSeries";
import type { FitnessClass } from "@/lib/db-types";

/** Folding a repeating routine into one row on the admin schedule. */

const NOW = Date.parse("2026-08-10T00:00:00.000Z");

function make(over: Partial<FitnessClass> = {}): FitnessClass {
  return {
    id: crypto.randomUUID(),
    title: "Morning Strength",
    trainer_name: null,
    trainer_id: null,
    scheduled_at: new Date(NOW + 86_400_000).toISOString(),
    duration_minutes: 45,
    livekit_room: crypto.randomUUID(),
    is_premium: true,
    audience: "all",
    status: "scheduled",
    series_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

const day = (n: number) => new Date(NOW + n * 86_400_000).toISOString();

describe("groupClassSeries", () => {
  it("leaves one-off classes as their own entries", () => {
    const entries = groupClassSeries([make(), make()], NOW);
    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.kind === "single")).toBe(true);
  });

  it("collapses a series into a single entry", () => {
    const classes = [
      make({ series_id: "s1", scheduled_at: day(1) }),
      make({ series_id: "s1", scheduled_at: day(3) }),
      make({ series_id: "s1", scheduled_at: day(5) }),
    ];

    const entries = groupClassSeries(classes, NOW);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe("series");
    if (entries[0].kind !== "series") throw new Error("unreachable");
    expect(entries[0].series.sessions).toHaveLength(3);
  });

  it("keeps two different series apart", () => {
    const entries = groupClassSeries(
      [make({ series_id: "s1" }), make({ series_id: "s2" })],
      NOW,
    );
    expect(entries).toHaveLength(2);
  });

  it("orders sessions within a series forwards, whatever the input order", () => {
    // The admin list arrives newest-first; a routine reads as a timetable.
    const classes = [
      make({ series_id: "s1", scheduled_at: day(5) }),
      make({ series_id: "s1", scheduled_at: day(1) }),
      make({ series_id: "s1", scheduled_at: day(3) }),
    ];

    const entries = groupClassSeries(classes, NOW);
    if (entries[0].kind !== "series") throw new Error("unreachable");

    expect(entries[0].series.sessions.map((s) => s.scheduled_at)).toEqual([
      day(1),
      day(3),
      day(5),
    ]);
  });

  it("places a series where its first-seen session was", () => {
    // A class must not jump up the page because it later gained a series.
    const entries = groupClassSeries(
      [
        make({ title: "One-off A" }),
        make({ series_id: "s1", title: "Routine" }),
        make({ title: "One-off B" }),
        make({ series_id: "s1", title: "Routine" }),
      ],
      NOW,
    );

    expect(entries.map((e) => (e.kind === "single" ? e.item.title : "Routine")))
      .toEqual(["One-off A", "Routine", "One-off B"]);
  });

  it("counts only sessions still to come as upcoming", () => {
    const classes = [
      make({ series_id: "s1", scheduled_at: day(-3) }),
      make({ series_id: "s1", scheduled_at: day(1) }),
      make({ series_id: "s1", scheduled_at: day(3) }),
    ];

    const entries = groupClassSeries(classes, NOW);
    if (entries[0].kind !== "series") throw new Error("unreachable");
    expect(entries[0].series.upcoming).toBe(2);
  });

  it("does not count cancelled or ended sessions as upcoming", () => {
    // "Cancel the rest" must not offer to cancel what is already off.
    const classes = [
      make({ series_id: "s1", scheduled_at: day(1), status: "cancelled" }),
      make({ series_id: "s1", scheduled_at: day(3), status: "ended" }),
      make({ series_id: "s1", scheduled_at: day(5), status: "scheduled" }),
    ];

    const entries = groupClassSeries(classes, NOW);
    if (entries[0].kind !== "series") throw new Error("unreachable");
    expect(entries[0].series.upcoming).toBe(1);
  });

  it("reports zero upcoming for a routine that has finished", () => {
    const classes = [
      make({ series_id: "s1", scheduled_at: day(-5) }),
      make({ series_id: "s1", scheduled_at: day(-1) }),
    ];

    const entries = groupClassSeries(classes, NOW);
    if (entries[0].kind !== "series") throw new Error("unreachable");
    expect(entries[0].series.upcoming).toBe(0);
  });

  it("handles an empty schedule", () => {
    expect(groupClassSeries([], NOW)).toEqual([]);
  });
});
