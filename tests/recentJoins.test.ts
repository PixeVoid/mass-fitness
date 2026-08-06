import { describe, expect, it } from "vitest";
import { recentJoins } from "@/lib/groups";

/**
 * "New in the last two weeks" on the coach page. Derived from the roster the
 * page has already fetched rather than a second query with a date bound.
 */

const NOW = Date.parse("2026-08-20T00:00:00.000Z");
const daysAgo = (n: number) =>
  ({ joined_at: new Date(NOW - n * 86_400_000).toISOString() });

describe("recentJoins", () => {
  it("keeps joins inside the fortnight", () => {
    expect(recentJoins([daysAgo(0), daysAgo(6), daysAgo(13)], NOW)).toHaveLength(3);
  });

  it("drops joins older than it", () => {
    expect(recentJoins([daysAgo(15), daysAgo(60)], NOW)).toHaveLength(0);
  });

  it("includes the boundary rather than excluding it", () => {
    // Someone who joined exactly fourteen days ago is still new today.
    expect(recentJoins([daysAgo(14)], NOW)).toHaveLength(1);
  });

  it("excludes just past the boundary", () => {
    const justOver = { joined_at: new Date(NOW - 14 * 86_400_000 - 1).toISOString() };
    expect(recentJoins([justOver], NOW)).toHaveLength(0);
  });

  it("keeps a join dated in the future", () => {
    // Clock skew between the database and the app should not hide someone.
    expect(recentJoins([daysAgo(-1)], NOW)).toHaveLength(1);
  });

  it("preserves the order it was given", () => {
    const rows = [daysAgo(1), daysAgo(5), daysAgo(3)];
    expect(recentJoins(rows, NOW).map((r) => r.joined_at)).toEqual(
      rows.map((r) => r.joined_at),
    );
  });

  it("handles an empty roster", () => {
    expect(recentJoins([], NOW)).toEqual([]);
  });
});
