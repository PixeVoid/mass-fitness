import type { PlanDuration, PlanTier } from "@/lib/db-types";

/**
 * Plan catalogue — tier x duration.
 *
 * The three tiers and their monthly prices are the ones the landing page
 * already sells, so those are authoritative. Quarterly and annual prices are
 * *not* confirmed: they are derived below from a placeholder discount and
 * flagged `priceConfirmed: false`. Phase 3 must not charge an unconfirmed
 * price — `assertChargeable()` exists to make that a hard failure rather than
 * something that quietly bills a made-up number.
 *
 * Money is in paise throughout. Rupee floats accumulate rounding errors the
 * moment a discount is applied.
 */

export const PLAN_TIERS = ["group", "one_to_one", "squad"] as const;
export const PLAN_DURATIONS = ["monthly", "quarterly", "annual"] as const;

interface TierDefinition {
  tier: PlanTier;
  /** Display name — matches the landing page copy. */
  label: string;
  summary: string;
  monthlyPaise: number;
  /** Squad is priced per person with a two-person minimum. */
  perPerson: boolean;
}

const TIERS: Record<PlanTier, TierDefinition> = {
  group: {
    tier: "group",
    label: "Group",
    summary:
      "Coached sessions with a room of people going through the same thing.",
    monthlyPaise: 149_900,
    perPerson: false,
  },
  one_to_one: {
    tier: "one_to_one",
    label: "One-to-one",
    summary:
      "The whole session is yours. Best if you're working around an injury or a deadline.",
    monthlyPaise: 299_900,
    perPerson: false,
  },
  squad: {
    tier: "squad",
    label: "Squad",
    summary:
      "Train with a partner. Cheaper than one-to-one, and far harder to skip.",
    monthlyPaise: 119_900,
    perPerson: true,
  },
};

interface DurationDefinition {
  duration: PlanDuration;
  label: string;
  months: number;
  /**
   * Placeholder until the user confirms real longer-term pricing. Only the
   * monthly row is a confirmed number.
   */
  discount: number;
  priceConfirmed: boolean;
}

const DURATIONS: Record<PlanDuration, DurationDefinition> = {
  monthly: {
    duration: "monthly",
    label: "Monthly",
    months: 1,
    discount: 0,
    priceConfirmed: true,
  },
  quarterly: {
    duration: "quarterly",
    label: "Quarterly",
    months: 3,
    discount: 0.1,
    priceConfirmed: false,
  },
  annual: {
    duration: "annual",
    label: "Annual",
    months: 12,
    discount: 0.2,
    priceConfirmed: false,
  },
};

export interface Plan {
  tier: PlanTier;
  duration: PlanDuration;
  /** Stable identifier for URLs and form values, e.g. "group-monthly". */
  id: string;
  label: string;
  durationLabel: string;
  summary: string;
  months: number;
  /** Total charged up front for the whole term. */
  amountPaise: number;
  /** Effective per-month cost, for "₹X/month billed quarterly" copy. */
  perMonthPaise: number;
  perPerson: boolean;
  priceConfirmed: boolean;
}

function buildPlan(tier: PlanTier, duration: PlanDuration): Plan {
  const t = TIERS[tier];
  const d = DURATIONS[duration];
  // Round to whole rupees so the checkout total is never ₹4,047.30.
  const amountPaise =
    Math.round((t.monthlyPaise * d.months * (1 - d.discount)) / 100) * 100;

  return {
    tier,
    duration,
    id: `${tier.replace(/_/g, "-")}-${duration}`,
    label: t.label,
    durationLabel: d.label,
    summary: t.summary,
    months: d.months,
    amountPaise,
    perMonthPaise: Math.round(amountPaise / d.months),
    perPerson: t.perPerson,
    priceConfirmed: d.priceConfirmed,
  };
}

export const PLANS: Plan[] = PLAN_TIERS.flatMap((tier) =>
  PLAN_DURATIONS.map((duration) => buildPlan(tier, duration)),
);

export function getPlan(tier: PlanTier, duration: PlanDuration): Plan {
  return buildPlan(tier, duration);
}

export function findPlanById(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

/**
 * Guard for Phase 3: refuses to hand an unconfirmed price to a payment
 * gateway. Delete the `priceConfirmed` flag entirely once every duration has a
 * real number signed off.
 */
export function assertChargeable(plan: Plan): Plan {
  if (!plan.priceConfirmed) {
    throw new Error(
      `Plan ${plan.id} has a placeholder price. Confirm ${plan.durationLabel.toLowerCase()} pricing before charging for it.`,
    );
  }
  return plan;
}

/** Renders paise as "₹1,499" — no decimals, since all prices are whole rupees. */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/** End date for a term starting at `from`. Used when a payment activates. */
export function termEndDate(plan: Plan, from: Date = new Date()): Date {
  const end = new Date(from);
  end.setMonth(end.getMonth() + plan.months);
  return end;
}
