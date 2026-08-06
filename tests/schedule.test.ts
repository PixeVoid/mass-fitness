import { describe, expect, it } from "vitest";
import {
  MAX_OCCURRENCES,
  MAX_WEEKS,
  buildRecurrence,
  describeWeekdays,
  istWeekday,
  parseIstLocal,
  toIstLocalInput,
  type Weekday,
} from "@/lib/schedule";

/**
 * Class times and repeating routines.
 *
 * The date arithmetic behind "every Mon/Wed/Fri for six weeks" is the kind of
 * thing that looks right and is off by a day at a boundary, so the boundaries
 * are what these test.
 */

describe("parseIstLocal", () => {
  it("reads a datetime-local value as IST, not as UTC", () => {
    // The bug this replaced: 7:00am became 7:00am UTC, which members saw as
    // 12:30pm. 7:00 IST is 01:30 UTC.
    const date = parseIstLocal("2026-08-10T07:00");
    expect(date?.toISOString()).toBe("2026-08-10T01:30:00.000Z");
  });

  it("handles a time that crosses midnight backwards into UTC", () => {
    // 04:00 IST is the previous day in UTC — the case where a naive
    // implementation loses a day.
    expect(parseIstLocal("2026-08-10T04:00")?.toISOString()).toBe(
      "2026-08-09T22:30:00.000Z",
    );
  });

  it("accepts an optional seconds component, which some browsers send", () => {
    expect(parseIstLocal("2026-08-10T07:00:00")?.toISOString()).toBe(
      "2026-08-10T01:30:00.000Z",
    );
  });

  it("refuses anything that is not the expected shape", () => {
    // `new Date()` would happily turn several of these into a real instant.
    for (const bad of ["", "not a date", "2026-08-10", "10/08/2026 07:00", "2026-13-40T99:99"]) {
      expect(parseIstLocal(bad)).toBeNull();
    }
  });

  it("round-trips through toIstLocalInput", () => {
    // An edit form that renders the UTC wall clock shifts the class by 5h30
    // on every save — so this pair has to be exact.
    for (const value of [
      "2026-01-01T00:00",
      "2026-08-10T07:00",
      "2026-12-31T23:45",
      "2026-03-15T04:30",
    ]) {
      const parsed = parseIstLocal(value)!;
      expect(toIstLocalInput(parsed)).toBe(value);
    }
  });
});

describe("istWeekday", () => {
  it("reads the weekday in IST, not in UTC", () => {
    // 04:00 IST on Monday 10 Aug 2026 is Sunday in UTC. It is a Monday class.
    const monday = parseIstLocal("2026-08-10T04:00")!;
    expect(monday.getUTCDay()).toBe(0); // Sunday, in UTC
    expect(istWeekday(monday)).toBe(1); // Monday, in IST
  });
});

describe("buildRecurrence", () => {
  const first = parseIstLocal("2026-08-10T07:00")!; // a Monday

  it("returns just the first session for a one-week, one-day routine", () => {
    const dates = buildRecurrence({ first, weekdays: [], weeks: 1 });
    expect(dates).toHaveLength(1);
    expect(dates[0].toISOString()).toBe(first.toISOString());
  });

  it("always includes the day the admin actually picked", () => {
    // Ticking only Wednesday must not move the Monday class they just chose.
    const dates = buildRecurrence({ first, weekdays: [3], weeks: 1 });
    expect(dates[0].toISOString()).toBe(first.toISOString());
    expect(dates.map((d) => istWeekday(d))).toEqual([1, 3]);
  });

  it("runs the rest of the first week rather than waiting until the next", () => {
    // A Mon/Wed/Fri routine started on a Monday runs that Wednesday.
    const dates = buildRecurrence({ first, weekdays: [1, 3, 5], weeks: 1 });
    expect(dates).toHaveLength(3);
    expect(dates.map((d) => toIstLocalInput(d))).toEqual([
      "2026-08-10T07:00",
      "2026-08-12T07:00",
      "2026-08-14T07:00",
    ]);
  });

  it("pushes an earlier weekday into the following week", () => {
    // Started on a Friday, a Mon/Fri routine runs Fri then the next Monday —
    // never the Monday three days before it was scheduled.
    const friday = parseIstLocal("2026-08-14T07:00")!;
    const dates = buildRecurrence({ first: friday, weekdays: [1, 5], weeks: 2 });

    expect(dates.map((d) => toIstLocalInput(d))).toEqual([
      "2026-08-14T07:00",
      "2026-08-17T07:00",
      "2026-08-21T07:00",
      "2026-08-24T07:00",
    ]);
  });

  it("never produces a session before the first one", () => {
    for (const day of [0, 1, 2, 3, 4, 5, 6] as Weekday[]) {
      const dates = buildRecurrence({ first, weekdays: [day], weeks: 4 });
      for (const date of dates) {
        expect(date.getTime()).toBeGreaterThanOrEqual(first.getTime());
      }
    }
  });

  it("keeps the same IST wall-clock time on every occurrence", () => {
    // The whole reason the times are pinned to IST: exact week arithmetic
    // preserves the wall clock only because the offset never moves.
    const dates = buildRecurrence({ first, weekdays: [1, 3, 5], weeks: 8 });
    for (const date of dates) {
      expect(toIstLocalInput(date).endsWith("T07:00")).toBe(true);
    }
  });

  it("produces weeks x days sessions", () => {
    expect(buildRecurrence({ first, weekdays: [1, 3, 5], weeks: 6 })).toHaveLength(18);
  });

  it("returns them in ascending order", () => {
    const dates = buildRecurrence({ first, weekdays: [0, 2, 4, 6], weeks: 3 });
    const times = dates.map((d) => d.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("does not duplicate a weekday that is also the first day", () => {
    const dates = buildRecurrence({ first, weekdays: [1], weeks: 3 });
    expect(dates).toHaveLength(3);
  });

  it("clamps the week count so one form cannot create a year of classes", () => {
    const dates = buildRecurrence({ first, weekdays: [1], weeks: 500 });
    expect(dates.length).toBeLessThanOrEqual(MAX_WEEKS);
  });

  it("caps total occurrences even when every day is picked", () => {
    const dates = buildRecurrence({
      first,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      weeks: MAX_WEEKS,
    });
    expect(dates.length).toBeLessThanOrEqual(MAX_OCCURRENCES);
  });

  it("treats a zero or negative week count as one week", () => {
    expect(buildRecurrence({ first, weekdays: [], weeks: 0 })).toHaveLength(1);
    expect(buildRecurrence({ first, weekdays: [], weeks: -5 })).toHaveLength(1);
  });
});

describe("describeWeekdays", () => {
  it("lists days in week order, not the order they were picked", () => {
    expect(describeWeekdays([5, 1, 3])).toBe("Mon, Wed & Fri");
  });

  it("puts Sunday last, as the week is shown in the picker", () => {
    expect(describeWeekdays([0, 1])).toBe("Mon & Sun");
  });

  it("handles one day and none", () => {
    expect(describeWeekdays([2])).toBe("Tue");
    expect(describeWeekdays([])).toBe("");
  });
});
