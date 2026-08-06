import { describe, expect, it } from "vitest";
import {
  canAccessClass,
  decideClassAccess,
  type ClassAccessInput,
} from "@/lib/classAccess";

/**
 * The rule that decides who is in a class.
 *
 * Every case below is one that was wrong in production code at some point:
 * the one-to-one tier silently getting group classes, a free class ignoring
 * its own group targeting, a host locked out of their own session. Three
 * copies of this logic existed and they disagreed — which is why it now lives
 * in one pure function with these tests around it.
 */

function input(overrides: Partial<ClassAccessInput> = {}): ClassAccessInput {
  return {
    audience: "all",
    isPremium: true,
    isHost: false,
    planTier: "group",
    memberGroupIds: [],
    classGroupIds: [],
    ...overrides,
  };
}

describe("hosts", () => {
  it("always get in, with no membership and no group", () => {
    expect(
      decideClassAccess(
        input({ isHost: true, planTier: null, audience: "groups", classGroupIds: ["g1"] }),
      ),
    ).toBe("ok");
  });
});

describe("open classes", () => {
  it("admit a paying group member", () => {
    expect(decideClassAccess(input({ planTier: "group" }))).toBe("ok");
  });

  it("refuse someone with no membership", () => {
    expect(decideClassAccess(input({ planTier: null }))).toBe(
      "subscription_required",
    );
  });

  it("refuse a one-to-one member — their plan buys private sessions only", () => {
    expect(decideClassAccess(input({ planTier: "one_to_one" }))).toBe(
      "not_in_group",
    );
  });

  it("admit anyone signed in when the class is free", () => {
    expect(
      decideClassAccess(input({ isPremium: false, planTier: null })),
    ).toBe("ok");
  });

  it("admit a one-to-one member to a free taster", () => {
    expect(
      decideClassAccess(input({ isPremium: false, planTier: "one_to_one" })),
    ).toBe("ok");
  });
});

describe("group-targeted classes", () => {
  it("admit a member of a targeted group", () => {
    expect(
      decideClassAccess(
        input({
          audience: "groups",
          classGroupIds: ["g1", "g2"],
          memberGroupIds: ["g2"],
        }),
      ),
    ).toBe("ok");
  });

  it("refuse a paying member of a different group", () => {
    expect(
      decideClassAccess(
        input({
          audience: "groups",
          classGroupIds: ["g1"],
          memberGroupIds: ["g9"],
        }),
      ),
    ).toBe("not_in_group");
  });

  it("admit a one-to-one member to their own private group's session", () => {
    expect(
      decideClassAccess(
        input({
          audience: "groups",
          planTier: "one_to_one",
          classGroupIds: ["private-1"],
          memberGroupIds: ["private-1"],
        }),
      ),
    ).toBe("ok");
  });

  it("still require payment from a group member for a premium session", () => {
    expect(
      decideClassAccess(
        input({
          audience: "groups",
          planTier: null,
          classGroupIds: ["g1"],
          memberGroupIds: ["g1"],
        }),
      ),
    ).toBe("subscription_required");
  });

  it("enforce targeting on a FREE class too", () => {
    // The bug: the whole gate sat inside `if (is_premium)`, so a free class
    // aimed at one cohort admitted anyone signed in.
    expect(
      decideClassAccess(
        input({
          audience: "groups",
          isPremium: false,
          planTier: null,
          classGroupIds: ["g1"],
          memberGroupIds: [],
        }),
      ),
    ).toBe("not_in_group");
  });

  it("admit nobody when marked for groups but targeting none", () => {
    // A half-finished class must fail closed, not open to everyone.
    expect(
      decideClassAccess(
        input({ audience: "groups", classGroupIds: [], memberGroupIds: ["g1"] }),
      ),
    ).toBe("not_in_group");
  });
});

describe("canAccessClass", () => {
  it("is true only when the decision is ok", () => {
    expect(canAccessClass(input({ planTier: "group" }))).toBe(true);
    expect(canAccessClass(input({ planTier: "one_to_one" }))).toBe(false);
    expect(canAccessClass(input({ planTier: null }))).toBe(false);
  });
});
