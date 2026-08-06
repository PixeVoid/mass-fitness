import type { ClassAudience, PlanTier } from "@/lib/db-types";

/**
 * The single rule for "may this person be in this class".
 *
 * Pure, and deliberately in its own file with no server imports, so the same
 * function decides the paywall in /api/live/token, what the dashboard lists,
 * and who the reminder job emails. Three copies of this logic is how a member
 * ends up emailed about a session the room then refuses them — and how the
 * one-to-one tier quietly gained access to group classes, which is exactly
 * what happened when the check lived in three places.
 */

export type JoinDecision = "ok" | "subscription_required" | "not_in_group";

export interface ClassAccessInput {
  audience: ClassAudience;
  /** Premium classes need a paid membership; free ones are the taster. */
  isPremium: boolean;
  /** Whoever runs the class is never a customer of it. */
  isHost: boolean;
  /** Tier of the active subscription, or null when there isn't one. */
  planTier: PlanTier | null;
  memberGroupIds: readonly string[];
  /** Groups this class targets. Empty when `audience` is "all". */
  classGroupIds: readonly string[];
}

export function decideClassAccess(input: ClassAccessInput): JoinDecision {
  if (input.isHost) return "ok";

  if (input.audience === "groups") {
    // Targeting is checked before payment and regardless of it. A free class
    // aimed at one cohort is still aimed at that cohort — reading the target
    // only for paid classes is what left private sessions open to anyone.
    const shares = input.classGroupIds.some((id) =>
      input.memberGroupIds.includes(id),
    );
    if (!shares) return "not_in_group";

    return input.isPremium && input.planTier === null
      ? "subscription_required"
      : "ok";
  }

  // audience === "all"
  if (!input.isPremium) return "ok";
  if (input.planTier === null) return "subscription_required";

  // A one-to-one plan buys private sessions and nothing else — the pricing
  // decision, enforced here rather than assumed. Without this the higher tier
  // silently included everything the lower one did.
  if (input.planTier === "one_to_one") return "not_in_group";

  return "ok";
}

/** Convenience wrapper for list filtering, where the reason does not matter. */
export function canAccessClass(input: ClassAccessInput): boolean {
  return decideClassAccess(input) === "ok";
}
