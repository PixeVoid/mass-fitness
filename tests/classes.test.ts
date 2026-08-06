import { describe, expect, it } from "vitest";
import { classJoinWindow, classWindow } from "@/lib/classes";

/** When a class is joinable — the number the countdown and the door share. */

const base = {
  scheduled_at: "2026-08-10T01:30:00.000Z", // 7:00am IST
  duration_minutes: 45,
  status: "scheduled" as const,
};

const START = Date.parse(base.scheduled_at);
const GRACE = 20 * 60_000;

describe("classJoinWindow", () => {
  it("opens 20 minutes early and closes 20 after the end", () => {
    const w = classJoinWindow(base);
    expect(w.startsAtMs).toBe(START);
    expect(w.opensAtMs).toBe(START - GRACE);
    expect(w.closesAtMs).toBe(START + 45 * 60_000 + GRACE);
  });

  it("keeps the door open for the whole class", () => {
    const w = classJoinWindow(base);
    expect(w.closesAtMs - w.opensAtMs).toBeGreaterThan(45 * 60_000);
  });
});

describe("classWindow", () => {
  const at = (ms: number) => classWindow(base, new Date(ms));

  it("is upcoming before the door opens", () => {
    expect(at(START - GRACE - 1000)).toBe("upcoming");
  });

  it("is open from the moment the door opens", () => {
    expect(at(START - GRACE + 1000)).toBe("open");
  });

  it("is open during the session", () => {
    expect(at(START + 10 * 60_000)).toBe("open");
  });

  it("is open through the grace period after the end", () => {
    expect(at(START + 45 * 60_000 + 5 * 60_000)).toBe("open");
  });

  it("is ended once the grace period lapses", () => {
    expect(at(START + 45 * 60_000 + GRACE + 1000)).toBe("ended");
  });

  it("is ended for a cancelled class regardless of the clock", () => {
    expect(
      classWindow({ ...base, status: "cancelled" }, new Date(START)),
    ).toBe("ended");
  });

  it("is ended for a class already marked ended", () => {
    expect(classWindow({ ...base, status: "ended" }, new Date(START))).toBe(
      "ended",
    );
  });

  it("agrees with classJoinWindow at every boundary", () => {
    // The two must never disagree: the countdown reads the timestamps and the
    // dashboard reads the verdict, and a mismatch shows a live join button on
    // a door that is shut.
    const w = classJoinWindow(base);
    expect(at(w.opensAtMs - 1)).toBe("upcoming");
    expect(at(w.opensAtMs)).toBe("open");
    expect(at(w.closesAtMs)).toBe("open");
    expect(at(w.closesAtMs + 1)).toBe("ended");
  });
});
