import type { PlanDuration, PlanTier } from "@/lib/db-types";

/**
 * Plan catalogue — tier x duration, pure and client-safe.
 *
 * The *numbers* (monthly price per tier, discount per duration) are admin-
 * editable and live in Supabase (`plan_prices`, `plan_duration_discounts`) —
 * see `src/lib/pricing.ts`, which fetches them and calls `buildPlan()` below.
 * This file only knows the tier/duration metadata (label, summary, months)
 * and the pure amortisation math, so it stays importable from client
 * components (e.g. the admin member row) without dragging in a Supabase
 * client.
 *
 * Money is in paise throughout. Rupee floats accumulate rounding errors the
 * moment a discount is applied.
 */

export const PLAN_TIERS = ["group", "one_to_one"] as const;
export const PLAN_DURATIONS = ["monthly", "quarterly", "annual"] as const;

interface TierMeta {
  tier: PlanTier;
  /** Display name — matches the landing page copy. */
  label: string;
  summary: string;
  perks: string[];
  /** Landing page highlights this one as the default choice. */
  featured: boolean;
}

export const TIER_META: Record<PlanTier, TierMeta> = {
  group: {
    tier: "group",
    label: "Group",
    summary:
      "Coached sessions with a room of people going through the same thing.",
    perks: [
      "Personalised diet plan",
      "Home workout support",
      "Group live sessions",
      "Flexible timings",
    ],
    featured: false,
  },
  one_to_one: {
    tier: "one_to_one",
    label: "One-to-one",
    summary:
      "The whole session is yours. Best if you're working around an injury or a deadline.",
    perks: [
      "Personalised diet plan",
      "Progress tracking & monitoring",
      "Gym + home programme",
      "Direct trainer access",
    ],
    featured: true,
  },
};

interface DurationMeta {
  duration: PlanDuration;
  label: string;
  months: number;
}

export const DURATION_META: Record<PlanDuration, DurationMeta> = {
  monthly: { duration: "monthly", label: "Monthly", months: 1 },
  quarterly: { duration: "quarterly", label: "Quarterly", months: 3 },
  annual: { duration: "annual", label: "Annual", months: 12 },
};

/** Per-tier, per-duration numbers — sourced from the DB, defaults in `src/lib/pricing.ts`. */
export interface PricingCatalogue {
  monthlyPaise: Record<PlanTier, number>;
  discounts: Record<PlanDuration, { discount: number; priceConfirmed: boolean }>;
}

export interface Plan {
  tier: PlanTier;
  duration: PlanDuration;
  /** Stable identifier for URLs and form values, e.g. "group-monthly". */
  id: string;
  label: string;
  durationLabel: string;
  summary: string;
  perks: string[];
  featured: boolean;
  months: number;
  /** Total charged up front for the whole term. */
  amountPaise: number;
  /** Effective per-month cost, for "₹X/month billed quarterly" copy. */
  perMonthPaise: number;
  priceConfirmed: boolean;
}

export function buildPlan(
  tier: PlanTier,
  duration: PlanDuration,
  catalogue: PricingCatalogue,
): Plan {
  const t = TIER_META[tier];
  const d = DURATION_META[duration];
  const monthlyPaise = catalogue.monthlyPaise[tier];
  const { discount, priceConfirmed } = catalogue.discounts[duration];

  // Round to whole rupees so the checkout total is never ₹4,047.30.
  const amountPaise =
    Math.round((monthlyPaise * d.months * (1 - discount)) / 100) * 100;

  return {
    tier,
    duration,
    id: `${tier.replace(/_/g, "-")}-${duration}`,
    label: t.label,
    durationLabel: d.label,
    summary: t.summary,
    perks: t.perks,
    featured: t.featured,
    months: d.months,
    amountPaise,
    perMonthPaise: Math.round(amountPaise / d.months),
    priceConfirmed,
  };
}

export function buildPlans(catalogue: PricingCatalogue): Plan[] {
  return PLAN_TIERS.flatMap((tier) =>
    PLAN_DURATIONS.map((duration) => buildPlan(tier, duration, catalogue)),
  );
}

export function findPlanById(plans: Plan[], id: string): Plan | undefined {
  return plans.find((plan) => plan.id === id);
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

/**
 * How many months a duration buys.
 *
 * Exported because the payment settlement needs it and has only the stored
 * `plan_duration` to hand, not a whole Plan — and a second switch statement
 * over the same three values is a second thing to forget when a duration is
 * added. This is what a customer's term length is derived from, so it is worth
 * there being exactly one of it.
 */
export function monthsForDuration(duration: PlanDuration): number {
  return DURATION_META[duration].months;
}

/**
 * `from` plus n months, clamped to the end of the target month.
 *
 * A plain `setMonth` overflows: 30 November plus three months lands on 2
 * March, because February has no 30th and JS rolls the excess forward. A
 * member who bought quarterly on the 30th silently got two extra days, and
 * every subsequent renewal drifted further from the day they signed up.
 *
 * Clamping is what billing systems do and what a customer expects — the last
 * day of the month is the honest answer to "the 30th of February".
 */
export function addMonths(from: Date, months: number): Date {
  const day = from.getDate();

  // Land on the 1st first, so adding months cannot overflow, then put the day
  // back — capped at however many days the destination month actually has.
  const end = new Date(from);
  end.setDate(1);
  end.setMonth(end.getMonth() + months);
  end.setDate(Math.min(day, daysInMonth(end.getFullYear(), end.getMonth())));

  return end;
}

/** Day 0 of the next month is the last day of this one. */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** End date for a term starting at `from`. Used when a payment activates. */
export function termEndDate(plan: Plan, from: Date = new Date()): Date {
  return addMonths(from, plan.months);
}
