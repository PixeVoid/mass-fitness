import { describe, expect, it } from "vitest";
import { planCta } from "@/lib/planCta";
import type { PlanTier } from "@/lib/db-types";

/**
 * What each price card says to each kind of visitor.
 *
 * The bug: both cards read one "is there anything left to sell this person"
 * boolean, so a member on Group was told "You're on this" under One-to-one as
 * well — the page claiming they had bought something they had not.
 */

function cta(over: Partial<Parameters<typeof planCta>[0]> = {}) {
  return planCta({
    cardTier: "group",
    cardLabel: "Group",
    isStaff: false,
    planTier: null,
    checkoutHref: "/subscribe?plan=group-monthly",
    ...over,
  });
}

describe("anonymous and unsubscribed visitors", () => {
  it("are sent into checkout for the card they tapped", () => {
    expect(cta().href).toBe("/subscribe?plan=group-monthly");
    expect(cta().label).toBe("Choose group");
  });

  it("get the card's own label, not a generic one", () => {
    expect(cta({ cardTier: "one_to_one", cardLabel: "One-to-one" }).label).toBe(
      "Choose one-to-one",
    );
  });

  it("are never told they are on a plan", () => {
    expect(cta().current).toBe(false);
  });
});

describe("a member on a plan", () => {
  it("is told so on that plan's card only", () => {
    const own = cta({ cardTier: "group", planTier: "group" });
    expect(own.current).toBe(true);
    expect(own.href).toBe("/dashboard");
  });

  it("is NOT told so on the other plan's card", () => {
    // The exact defect. Both cards said "You're on this".
    const other = cta({ cardTier: "one_to_one", planTier: "group" });
    expect(other.current).toBe(false);
    expect(other.label).not.toContain("Your plan");
  });

  it("never gets a link into checkout, on either card", () => {
    // /subscribe redirects an active member away, so a checkout link here is
    // a button that goes nowhere.
    for (const cardTier of ["group", "one_to_one"] as PlanTier[]) {
      for (const planTier of ["group", "one_to_one"] as PlanTier[]) {
        expect(cta({ cardTier, planTier }).href).not.toContain("/subscribe");
      }
    }
  });

  it("is pointed at a route that can actually switch them", () => {
    const other = cta({ cardTier: "one_to_one", planTier: "group" });
    expect(other.href).toBe("/#contact");
    expect(other.label).toContain("Switch");
  });

  it("marks exactly one of the two cards as current", () => {
    for (const planTier of ["group", "one_to_one"] as PlanTier[]) {
      const marked = (["group", "one_to_one"] as PlanTier[])
        .map((cardTier) => cta({ cardTier, planTier }).current)
        .filter(Boolean);
      expect(marked).toHaveLength(1);
    }
  });
});

describe("staff", () => {
  it("are never sold anything, on either card", () => {
    for (const cardTier of ["group", "one_to_one"] as PlanTier[]) {
      const result = cta({ cardTier, isStaff: true });
      expect(result.href).toBe("/dashboard");
      expect(result.href).not.toContain("/subscribe");
    }
  });

  it("are not marked as being on a plan they never bought", () => {
    expect(cta({ isStaff: true }).current).toBe(false);
    expect(cta({ isStaff: true, cardTier: "one_to_one" }).current).toBe(false);
  });

  it("stay staff even if they somehow hold a subscription", () => {
    const result = cta({ isStaff: true, planTier: "group" });
    expect(result.label).toBe("Go to your dashboard");
  });
});
