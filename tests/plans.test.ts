import { describe, expect, it } from "vitest";
import {
  buildPlan,
  buildPlans,
  findPlanById,
  formatPaise,
  termEndDate,
  assertChargeable,
  type PricingCatalogue,
} from "@/lib/plans";

/** The arithmetic that decides what a customer is charged. */

const catalogue: PricingCatalogue = {
  monthlyPaise: { group: 250_000, one_to_one: 500_000 },
  discounts: {
    monthly: { discount: 0, priceConfirmed: true },
    quarterly: { discount: 0.1, priceConfirmed: true },
    annual: { discount: 0.2, priceConfirmed: true },
  },
};

describe("plan pricing", () => {
  it("charges the monthly rate for one month", () => {
    expect(buildPlan("group", "monthly", catalogue).amountPaise).toBe(250_000);
  });

  it("applies the quarterly discount across three months", () => {
    // 2500 x 3 x 0.9 = 6750
    expect(buildPlan("group", "quarterly", catalogue).amountPaise).toBe(675_000);
  });

  it("applies the annual discount across twelve", () => {
    // 5000 x 12 x 0.8 = 48000
    expect(buildPlan("one_to_one", "annual", catalogue).amountPaise).toBe(
      4_800_000,
    );
  });

  it("never produces a fractional rupee", () => {
    // A gateway total of ₹4,047.30 is a support ticket, so totals round to
    // whole rupees — every amount must be a multiple of 100 paise.
    for (const plan of buildPlans(catalogue)) {
      expect(plan.amountPaise % 100).toBe(0);
    }
  });

  it("derives a per-month figure that multiplies back to the total", () => {
    const plan = buildPlan("group", "quarterly", catalogue);
    expect(plan.perMonthPaise * plan.months).toBe(plan.amountPaise);
  });

  it("makes longer terms cheaper per month, never dearer", () => {
    const monthly = buildPlan("group", "monthly", catalogue);
    const quarterly = buildPlan("group", "quarterly", catalogue);
    const annual = buildPlan("group", "annual", catalogue);

    expect(quarterly.perMonthPaise).toBeLessThan(monthly.perMonthPaise);
    expect(annual.perMonthPaise).toBeLessThan(quarterly.perMonthPaise);
  });
});

describe("plan ids", () => {
  it("round-trip through findPlanById", () => {
    const plans = buildPlans(catalogue);
    for (const plan of plans) {
      expect(findPlanById(plans, plan.id)?.id).toBe(plan.id);
    }
  });

  it("are unique across the catalogue", () => {
    const ids = buildPlans(catalogue).map((plan) => plan.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carry no underscores — they end up in URLs", () => {
    for (const plan of buildPlans(catalogue)) {
      expect(plan.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("assertChargeable", () => {
  it("refuses to hand a placeholder price to a gateway", () => {
    const unconfirmed: PricingCatalogue = {
      ...catalogue,
      discounts: {
        ...catalogue.discounts,
        annual: { discount: 0.2, priceConfirmed: false },
      },
    };
    expect(() =>
      assertChargeable(buildPlan("group", "annual", unconfirmed)),
    ).toThrow();
  });
});

describe("termEndDate", () => {
  it("adds the plan's months", () => {
    const from = new Date("2026-01-15T00:00:00Z");
    expect(termEndDate(buildPlan("group", "monthly", catalogue), from))
      .toEqual(new Date("2026-02-15T00:00:00Z"));
    expect(termEndDate(buildPlan("group", "annual", catalogue), from))
      .toEqual(new Date("2027-01-15T00:00:00Z"));
  });

  it("always lands after it started", () => {
    // JS month arithmetic overflows 31 Jan + 1 month into 2/3 March. Ugly, but
    // it must never produce an end date before the start.
    const from = new Date("2026-01-31T00:00:00Z");
    for (const plan of buildPlans(catalogue)) {
      expect(termEndDate(plan, from).getTime()).toBeGreaterThan(from.getTime());
    }
  });
});

describe("formatPaise", () => {
  it("renders paise as whole rupees, no decimals", () => {
    expect(formatPaise(250_000)).toBe("₹2,500");
    expect(formatPaise(4_800_000)).toBe("₹48,000");
  });

  it("groups digits the Indian way — lakhs, not thousands", () => {
    expect(formatPaise(10_000_000)).toBe("₹1,00,000");
  });
});
