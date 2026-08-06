import { describe, expect, it } from "vitest";
import { classJoinWindow, classWindow, decideClassDoor } from "@/lib/classes";
import type { ClassStatus } from "@/lib/db-types";

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

describe("decideClassDoor", () => {
  const member = (
    now: number,
    over: Partial<Omit<typeof base, "status">> & { status?: ClassStatus } = {},
  ) => decideClassDoor({ ...base, ...over }, { isHost: false, now });

  it("refuses a member before the door opens", () => {
    expect(member(START - GRACE - 1)).toBe("too_early");
  });

  it("admits a member from the moment it opens", () => {
    expect(member(START - GRACE)).toBe("open");
  });

  it("admits a member through the class and its grace period", () => {
    expect(member(START + 10 * 60_000)).toBe("open");
    expect(member(START + 45 * 60_000 + GRACE)).toBe("open");
  });

  it("shuts once the grace period lapses", () => {
    expect(member(START + 45 * 60_000 + GRACE + 1)).toBe("closed");
  });

  it("shuts for a cancelled or ended class whatever the clock says", () => {
    expect(member(START, { status: "cancelled" })).toBe("closed");
    expect(member(START, { status: "ended" })).toBe("closed");
  });

  it("does not let a 'live' status hold the door open forever", () => {
    // The hole this whole function exists to close. Status is set by hand, so
    // a trainer who marks a class live and never marks it ended must not leave
    // a room anyone can walk into next week.
    expect(member(START + 45 * 60_000 + GRACE + 1, { status: "live" })).toBe(
      "closed",
    );
  });

  it("lets the host in early to set up, and back in after an overrun", () => {
    const host = (now: number) =>
      decideClassDoor(base, { isHost: true, now });

    expect(host(START - 6 * 60 * 60_000)).toBe("open");
    expect(host(START + 45 * 60_000 + GRACE + 1)).toBe("open");
  });

  it("still shuts a cancelled class on the host", () => {
    expect(
      decideClassDoor({ ...base, status: "cancelled" }, { isHost: true }),
    ).toBe("closed");
  });

  it("never disagrees with what the dashboard drew", () => {
    // The dashboard renders a Join button on `classWindow === "open"`. If the
    // door said otherwise, that button would lead to a refusal — the exact
    // mismatch this pair is meant to make impossible.
    for (const offset of [
      -GRACE - 1, -GRACE, 0, 10 * 60_000, 45 * 60_000 + GRACE, 45 * 60_000 + GRACE + 1,
    ]) {
      const now = START + offset;
      const drawn = classWindow(base, new Date(now)) === "open";
      expect(member(now) === "open").toBe(drawn);
    }
  });
});
