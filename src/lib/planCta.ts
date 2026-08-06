import type { PlanTier } from "@/lib/db-types";

/**
 * What a price card's button should say, and where it should go.
 *
 * This was a single boolean — "is there anything left to sell this person" —
 * which is the right question for a page-level CTA and the wrong one for a
 * card. Both cards read it, so a member on the Group plan saw "You're on
 * this" under One-to-one as well: the site telling them they had bought
 * something they had not.
 *
 * A card has to compare against *its own* tier. Four outcomes, and each one
 * has to lead somewhere that works — which is why "switch" does not point at
 * /subscribe: that route turns away anyone with a live membership, so
 * offering it to an existing member is a button into a redirect.
 */

export interface PlanCtaInput {
  /** The tier this particular card is selling. */
  cardTier: PlanTier;
  isStaff: boolean;
  /** The viewer's active tier, or null when they have none. */
  planTier: PlanTier | null;
  /** Deep link into checkout with this card preselected. */
  checkoutHref: string;
  /** Human name of the tier, for the "Choose …" wording. */
  cardLabel: string;
}

export interface PlanCta {
  href: string;
  label: string;
  /** True when this card is the plan the viewer is actually on. */
  current: boolean;
}

export function planCta(input: PlanCtaInput): PlanCta {
  // Staff never buy anything, on either card.
  if (input.isStaff) {
    return { href: "/dashboard", label: "Go to your dashboard", current: false };
  }

  if (input.planTier === null) {
    return {
      href: input.checkoutHref,
      label: `Choose ${input.cardLabel.toLowerCase()}`,
      current: false,
    };
  }

  if (input.planTier === input.cardTier) {
    return {
      href: "/dashboard",
      label: "Your plan — open dashboard",
      current: true,
    };
  }

  // They have a membership, but not this one. Switching is not self-serve —
  // /subscribe redirects an active member away — so this points at the one
  // route that can actually action it.
  return { href: "/#contact", label: "Switch to this — talk to us", current: false };
}
