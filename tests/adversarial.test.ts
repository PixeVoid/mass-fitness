import { describe, expect, it } from "vitest";
import { canAccessClass } from "@/lib/classAccess";
import { normalisePhone } from "@/lib/phone";
import { safeRedirectTarget } from "@/lib/routes";
import { buildNextClass, classJoinWindow } from "@/lib/classes";
import type { FitnessClass } from "@/lib/db-types";

/** Hostile and degenerate inputs, on the paths that decide access or money. */

function makeClass(over: Partial<FitnessClass> = {}): FitnessClass {
  return {
    id: "c1", title: "Class", trainer_name: null, trainer_id: null,
    scheduled_at: new Date(Date.now() + 3_600_000).toISOString(),
    duration_minutes: 45, livekit_room: "r", is_premium: true,
    audience: "all", status: "scheduled",
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("open-redirect defences", () => {
  it("refuses every shape of off-site target", () => {
    const hostile = [
      "https://evil.example", "//evil.example", "\\\\evil.example",
      "javascript:alert(1)", "http://evil.example/x", "///evil.example",
      " //evil.example", "https:/evil.example",
    ];
    for (const target of hostile) {
      expect(safeRedirectTarget(target), target).toBe("/dashboard");
    }
  });

  it("keeps a legitimate path with a query and a fragment", () => {
    expect(safeRedirectTarget("/dashboard?notice=x#top")).toBe("/dashboard?notice=x#top");
  });
});

describe("class access under degenerate input", () => {
  it("is not fooled by an empty group id on either side", () => {
    expect(canAccessClass({
      audience: "groups", isPremium: true, isHost: false, planTier: "group",
      memberGroupIds: [""], classGroupIds: [],
    })).toBe(false);

    expect(canAccessClass({
      audience: "groups", isPremium: true, isHost: false, planTier: "group",
      memberGroupIds: [], classGroupIds: [""],
    })).toBe(false);
  });

  it("does not treat a duplicated group id as two matches", () => {
    expect(canAccessClass({
      audience: "groups", isPremium: true, isHost: false, planTier: "group",
      memberGroupIds: ["g1", "g1"], classGroupIds: ["g1"],
    })).toBe(true);
  });

  it("is case-sensitive on group ids — they are uuids, not names", () => {
    expect(canAccessClass({
      audience: "groups", isPremium: true, isHost: false, planTier: "group",
      memberGroupIds: ["ABC"], classGroupIds: ["abc"],
    })).toBe(false);
  });
});

describe("phone normalisation under junk", () => {
  it("rejects text, symbols and absurd lengths without throwing", () => {
    for (const junk of ["", "   ", "abcdefghij", "++++", "+", "-", "()",
                        "9".repeat(40), "+9".repeat(30), "\n\t"]) {
      expect(() => normalisePhone(junk)).not.toThrow();
      expect(normalisePhone(junk).ok, JSON.stringify(junk)).toBe(false);
    }
  });

  it("is idempotent — normalising twice changes nothing", () => {
    const once = normalisePhone("09876543210");
    expect(once.ok).toBe(true);
    if (once.ok) {
      const twice = normalisePhone(once.phone);
      expect(twice.ok).toBe(true);
      if (twice.ok) expect(twice.phone).toBe(once.phone);
    }
  });
});

describe("buildNextClass", () => {
  const profile = { id: "u1", role: "member" as const };

  it("returns nothing when there are no classes", () => {
    expect(buildNextClass([], profile, true).nextClass).toBeNull();
  });

  it("skips a class whose window has already closed", () => {
    const past = makeClass({
      id: "old",
      scheduled_at: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    });
    const soon = makeClass({ id: "soon" });
    expect(buildNextClass([past, soon], profile, true).nextClass?.id).toBe("soon");
  });

  it("marks a member without a membership as unable to join a premium class", () => {
    const result = buildNextClass([makeClass()], profile, false);
    expect(result.nextClass?.canJoin).toBe(false);
  });

  it("lets anyone join a free class", () => {
    const result = buildNextClass([makeClass({ is_premium: false })], profile, false);
    expect(result.nextClass?.canJoin).toBe(true);
  });

  it("treats the assigned trainer as host, membership or not", () => {
    const own = makeClass({ trainer_id: "u1" });
    const result = buildNextClass([own], { id: "u1", role: "trainer" }, false);
    expect(result.nextClass?.isHost).toBe(true);
    expect(result.nextClass?.canJoin).toBe(true);
  });

  it("treats an admin as host of anyone's class", () => {
    const other = makeClass({ trainer_id: "someone-else" });
    const result = buildNextClass([other], { id: "u1", role: "admin" }, false);
    expect(result.nextClass?.isHost).toBe(true);
  });

  it("hands the banner timestamps that match classJoinWindow exactly", () => {
    const item = makeClass();
    const { nextClass } = buildNextClass([item], profile, true);
    const window = classJoinWindow(item);
    expect(nextClass?.opensAtMs).toBe(window.opensAtMs);
    expect(nextClass?.closesAtMs).toBe(window.closesAtMs);
    expect(nextClass?.startsAtMs).toBe(window.startsAtMs);
  });

  it("reports a server clock, not a zero", () => {
    const { nowMs } = buildNextClass([], profile, true);
    expect(nowMs).toBeGreaterThan(Date.parse("2026-01-01T00:00:00Z"));
  });
});
