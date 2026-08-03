"use server";

import { redirect } from "next/navigation";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getActiveSubscription } from "@/lib/auth/dal";
import { startCheckout } from "@/lib/payments/subscriptions";
import { assertChargeable, findPlanById } from "@/lib/plans";
import { getPlans } from "@/lib/pricing";
import { publicEnv } from "@/lib/env";

/**
 * Begins a purchase (BUILD_PLAN Phase 3).
 *
 * A Server Action rather than the `/api/payments/initiate` route the plan
 * names. The plan's requirement is that initiation happens server-side with
 * the merchant keys never reaching the browser, which this satisfies — and
 * being a Server Action it inherits Next's origin checking, where an open POST
 * route would need its own. The callback in Phase 3 does have to stay a route
 * handler: PhonePe posts to it, and PhonePe cannot invoke a Server Action.
 *
 * Treat it as a public endpoint regardless. Everything that decides what is
 * charged is re-derived here: the form supplies a plan *id*, and the price
 * comes from the catalogue, never from the request.
 */
export async function beginCheckout(formData: FormData) {
  const profile = await requireOnboardedProfile();

  // Buying a second membership on top of a live one just spends money for
  // nothing — the access check only ever reads the latest active row.
  if (await getActiveSubscription()) {
    redirect("/dashboard?notice=already-subscribed");
  }

  const planId = String(formData.get("plan") ?? "");
  const plan = findPlanById(await getPlans(), planId);

  if (!plan) {
    redirect("/subscribe?error=unknown-plan");
  }

  // Refuses to hand a placeholder price to a gateway.
  assertChargeable(plan);

  let redirectUrl: string;
  try {
    const checkout = await startCheckout(
      profile.id,
      plan,
      `${publicEnv.siteUrl}/subscribe/return`,
    );
    redirectUrl = checkout.redirectUrl;
  } catch (error) {
    console.error("[payments] checkout failed", error);
    redirect("/subscribe?error=gateway");
  }

  // redirect() signals by throwing, so it sits outside the try above — inside
  // it, the catch would swallow the redirect and report a gateway failure for
  // a checkout that had just succeeded.
  redirect(redirectUrl);
}
