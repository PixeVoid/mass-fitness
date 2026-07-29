"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { PLAN_DURATIONS, PLAN_TIERS } from "@/lib/plans";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin pricing edits (/admin/pricing).
 *
 * Uses the admin's own client rather than the service role: `plan_prices` and
 * `plan_duration_discounts` both carry an "admin write" RLS policy
 * (0004_pricing.sql), so the database re-verifies the caller the same way it
 * does for `classes: admin write` — the pattern `actions/admin.ts` already
 * follows for writes that do have a covering policy.
 */

export interface ActionState {
  error?: string;
  success?: string;
}

const pricingSchema = z.object({
  groupRupees: z.coerce.number().int().min(1).max(100_000),
  oneToOneRupees: z.coerce.number().int().min(1).max(100_000),
  quarterlyDiscountPercent: z.coerce.number().min(0).max(90),
  annualDiscountPercent: z.coerce.number().min(0).max(90),
});

/** Every plan tier and duration is edited from one form and saved together. */
export async function updatePricing(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = pricingSchema.safeParse({
    groupRupees: formData.get("groupRupees"),
    oneToOneRupees: formData.get("oneToOneRupees"),
    quarterlyDiscountPercent: formData.get("quarterlyDiscountPercent"),
    annualDiscountPercent: formData.get("annualDiscountPercent"),
  });
  if (!parsed.success) {
    return { error: "Check the prices and discounts entered." };
  }

  const supabase = await createClient();

  const priceUpdates = PLAN_TIERS.map((tier) =>
    supabase.from("plan_prices").upsert({
      tier,
      monthly_paise:
        (tier === "group" ? parsed.data.groupRupees : parsed.data.oneToOneRupees) *
        100,
    }),
  );

  const discountUpdates = PLAN_DURATIONS.map((duration) => {
    if (duration === "monthly") {
      return supabase
        .from("plan_duration_discounts")
        .upsert({ duration, discount: 0, price_confirmed: true });
    }
    const percent =
      duration === "quarterly"
        ? parsed.data.quarterlyDiscountPercent
        : parsed.data.annualDiscountPercent;
    return supabase.from("plan_duration_discounts").upsert({
      duration,
      discount: percent / 100,
      price_confirmed: true,
    });
  });

  const results = await Promise.all([...priceUpdates, ...discountUpdates]);
  const failed = results.find((r) => r.error);
  if (failed) {
    return { error: "Couldn't save pricing." };
  }

  revalidatePath("/admin/pricing");
  revalidatePath("/");
  revalidatePath("/dashboard");
  return { success: "Pricing updated." };
}
