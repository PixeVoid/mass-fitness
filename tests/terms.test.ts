import { describe, expect, it } from "vitest";
import {
  DURATION_META,
  PLAN_DURATIONS,
  addMonths,
  buildPlan,
  monthsForDuration,
  termEndDate,
} from "@/lib/plans";
import type { PricingCatalogue } from "@/lib/plans";

/**
 * Term length — the number a paying customer's access is measured in.
 *
 * It had two definitions: the catalogue's, and a switch statement inside
 * payment settlement. Nothing kept them in step, and the one that decided what
 * somebody actually got was the copy.
 */

const catalogue: PricingCatalogue = {
  monthlyPaise: { group: 250_000, one_to_one: 500_000 },
  discounts: {
    monthly: { discount: 0, priceConfirmed: true },
    quarterly: { discount: 0.1, priceConfirmed: true },
    annual: { discount: 0.2, priceConfirmed: true },
  },
};

describe("monthsForDuration", () => {
  it("agrees with the catalogue for every duration", () => {
    for (const duration of PLAN_DURATIONS) {
      expect(monthsForDuration(duration)).toBe(DURATION_META[duration].months);
    }
  });

  it("agrees with what buildPlan puts on the plan", () => {
    for (const duration of PLAN_DURATIONS) {
      expect(buildPlan("group", duration, catalogue).months)
        .toBe(monthsForDuration(duration));
    }
  });

  it("covers every duration we sell", () => {
    for (const duration of PLAN_DURATIONS) {
      expect(monthsForDuration(duration)).toBeGreaterThan(0);
    }
  });
});

describe("addMonths", () => {
  it("adds whole months", () => {
    expect(addMonths(new Date("2026-03-15T10:00:00Z"), 3))
      .toEqual(new Date("2026-06-15T10:00:00Z"));
  });

  it("crosses a year boundary", () => {
    expect(addMonths(new Date("2026-11-30T00:00:00Z"), 3))
      .toEqual(new Date("2027-02-28T00:00:00Z"));
  });

  it("clamps to the end of the month instead of overflowing", () => {
    // A plain setMonth rolls the excess forward: 31 Jan + 1 month becomes 3
    // March, so a monthly member bought on the 31st got three free days and
    // their renewal date drifted every cycle.
    expect(addMonths(new Date("2026-01-31T00:00:00Z"), 1))
      .toEqual(new Date("2026-02-28T00:00:00Z"));
    expect(addMonths(new Date("2028-01-31T00:00:00Z"), 1))
      .toEqual(new Date("2028-02-29T00:00:00Z")); // leap year
    expect(addMonths(new Date("2026-08-31T00:00:00Z"), 1))
      .toEqual(new Date("2026-09-30T00:00:00Z"));
  });

  it("never lands in the month after the one it was aiming at", () => {
    for (let day = 28; day <= 31; day++) {
      for (let month = 0; month < 12; month++) {
        const from = new Date(Date.UTC(2026, month, 1));
        const last = new Date(Date.UTC(2026, month + 1, 0)).getUTCDate();
        if (day > last) continue;
        from.setUTCDate(day);

        for (const months of [1, 3, 12]) {
          const end = addMonths(from, months);
          const expectedMonth = (month + months) % 12;
          expect(end.getMonth(), `${from.toISOString()} +${months}`)
            .toBe(expectedMonth);
        }
      }
    }
  });

  it("keeps the same day of month whenever that day exists", () => {
    const from = new Date("2026-03-15T00:00:00Z");
    for (const months of [1, 3, 12]) {
      expect(addMonths(from, months).getDate()).toBe(15);
    }
  });

  it("never goes backwards, even from a month-end", () => {
    // 31 Jan + 1 month overflows into March in JS. Ugly, but a member must
    // never be given an end date before their start date.
    for (const day of ["2026-01-29", "2026-01-30", "2026-01-31", "2026-08-31"]) {
      const from = new Date(`${day}T00:00:00Z`);
      for (const months of [1, 3, 12]) {
        expect(addMonths(from, months).getTime(), `${day} +${months}`)
          .toBeGreaterThan(from.getTime());
      }
    }
  });

  it("does not mutate the date it was given", () => {
    const from = new Date("2026-03-15T00:00:00Z");
    const before = from.getTime();
    addMonths(from, 6);
    expect(from.getTime()).toBe(before);
  });

  it("gives an annual term roughly a year", () => {
    const from = new Date("2026-03-15T00:00:00Z");
    const days = (addMonths(from, 12).getTime() - from.getTime()) / 86_400_000;
    expect(days).toBeGreaterThan(364);
    expect(days).toBeLessThan(367);
  });
});

describe("termEndDate and settlement agree", () => {
  it("produce the same end date from a Plan and from a stored duration", () => {
    // Settlement only has the stored `plan_duration`; the admin grant path has
    // a whole Plan. Both must land on the same day or a member's access ends
    // on a different date depending on how they got it.
    const from = new Date("2026-05-20T09:30:00Z");
    for (const duration of PLAN_DURATIONS) {
      const viaPlan = termEndDate(buildPlan("group", duration, catalogue), from);
      const viaDuration = addMonths(from, monthsForDuration(duration));
      expect(viaPlan.getTime(), duration).toBe(viaDuration.getTime());
    }
  });
});
