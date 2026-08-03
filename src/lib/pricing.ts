import "server-only";

import { cache } from "react";
import {
  PLAN_DURATIONS,
  PLAN_TIERS,
  buildPlan,
  buildPlans,
  type Plan,
  type PricingCatalogue,
} from "@/lib/plans";
import type { PlanDuration, PlanTier } from "@/lib/db-types";
import { createClient } from "@/lib/supabase/server";

/**
 * Fallback numbers, used whenever `plan_prices`/`plan_duration_discounts` are
 * unreachable or empty — no Supabase project configured yet in this
 * environment (see BUILD_PLAN), a fresh project before the seed migration has
 * run, or a transient read failure. The landing page must render a price
 * either way, so this is a fallback, not an error path.
 */
const FALLBACK_CATALOGUE: PricingCatalogue = {
  monthlyPaise: {
    group: 250_000,
    one_to_one: 500_000,
  },
  discounts: {
    monthly: { discount: 0, priceConfirmed: true },
    quarterly: { discount: 0.1, priceConfirmed: true },
    annual: { discount: 0.2, priceConfirmed: true },
  },
};

/**
 * Reads current pricing from Supabase, memoised per request via React
 * `cache()` — several server components on one page (e.g. the landing page's
 * pricing section and its structured-data JSON-LD) can both call this without
 * issuing the query twice.
 *
 * Uses the request's own (anon-key) client, not the service role: the
 * `plan_prices` / `plan_duration_discounts` tables are publicly readable by
 * RLS policy, same reasoning as `classes: public read`.
 */
export const getPricingCatalogue = cache(
  async (): Promise<PricingCatalogue> => {
    try {
      const supabase = await createClient();
      const [{ data: prices }, { data: discounts }] = await Promise.all([
        supabase.from("plan_prices").select("*"),
        supabase.from("plan_duration_discounts").select("*"),
      ]);

      const monthlyPaise = { ...FALLBACK_CATALOGUE.monthlyPaise };
      for (const row of prices ?? []) {
        if (PLAN_TIERS.includes(row.tier as PlanTier)) {
          monthlyPaise[row.tier as PlanTier] = row.monthly_paise;
        }
      }

      const discountMap = { ...FALLBACK_CATALOGUE.discounts };
      for (const row of discounts ?? []) {
        if (PLAN_DURATIONS.includes(row.duration as PlanDuration)) {
          discountMap[row.duration as PlanDuration] = {
            discount: row.discount,
            priceConfirmed: row.price_confirmed,
          };
        }
      }

      return { monthlyPaise, discounts: discountMap };
    } catch {
      // Supabase not configured, or the request has no cookie store (e.g. a
      // route without a request context) — fall back rather than 500 the
      // marketing page over a pricing lookup.
      return FALLBACK_CATALOGUE;
    }
  },
);

export async function getPlans(): Promise<Plan[]> {
  return buildPlans(await getPricingCatalogue());
}

export async function getPlan(tier: PlanTier, duration: PlanDuration): Promise<Plan> {
  return buildPlan(tier, duration, await getPricingCatalogue());
}
