import "server-only";

import { randomUUID } from "node:crypto";
import type { Subscription } from "@/lib/db-types";
import { createMockProvider } from "@/lib/payments/mock";
import { createPhonePeProvider } from "@/lib/payments/phonepe";
import type { PaymentProvider } from "@/lib/payments/provider";
import { addMonths, monthsForDuration, type Plan, termEndDate } from "@/lib/plans";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The money-touching half of Phase 3.
 *
 * Every write here uses the service-role client, because `subscriptions` has
 * no client-side insert or update policy at all — by design. A member being
 * able to write their own membership row is the entire attack, and no amount
 * of UI hiding substitutes for the database simply not allowing it.
 */

export function getPaymentProvider(): PaymentProvider {
  if (serverEnv.paymentProvider === "mock") return createMockProvider();

  return createPhonePeProvider({
    clientId: serverEnv.phonePeClientId,
    clientSecret: serverEnv.phonePeClientSecret,
    clientVersion: serverEnv.phonePeClientVersion,
    environment: serverEnv.phonePeEnvironment,
    webhookUsername: serverEnv.phonePeWebhookUsername,
    webhookPassword: serverEnv.phonePeWebhookPassword,
  });
}

/**
 * A merchant order id: our idempotency key, and the only handle the gateway
 * gets on this purchase.
 *
 * Not the subscription's own uuid. PhonePe rejects a repeated merchant order
 * id, which is what makes retrying a failed payment need a fresh one — so the
 * key has to be able to change while the row it belongs to does not. Kept
 * inside PhonePe's length and character limits, and carrying no user id: it
 * appears in redirect URLs and gateway dashboards.
 */
function newMerchantOrderId(): string {
  return `mf_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

/**
 * Opens a purchase: writes a `pending` row and returns it with the gateway URL
 * to send the customer to.
 *
 * The row is written *before* the gateway is called, so a payment that
 * completes while our own response is lost still has somewhere to land when
 * the webhook arrives. A pending row with no payment behind it is harmless —
 * it grants nothing, and `getActiveSubscription` filters on status and date.
 */
export async function startCheckout(
  userId: string,
  plan: Plan,
  /** Base return URL; the order id is appended here, not by the caller. */
  returnUrlBase: string,
): Promise<{ redirectUrl: string; merchantOrderId: string }> {
  const merchantOrderId = newMerchantOrderId();
  const supabase = createAdminClient();

  const { error } = await supabase.from("subscriptions").insert({
    user_id: userId,
    plan_tier: plan.tier,
    plan_duration: plan.duration,
    // Priced from the catalogue at purchase time and stored on the row: a
    // later price change must never rewrite what someone was charged.
    amount_paise: plan.amountPaise,
    status: "pending",
    phonepe_merchant_txn_id: merchantOrderId,
  });

  if (error) {
    console.error("[payments] could not open checkout", error);
    throw new Error("checkout_failed");
  }

  const provider = getPaymentProvider();
  const payment = await provider.createPayment({
    merchantOrderId,
    amountPaise: plan.amountPaise,
    // The gateway is told where to send the browser back to, carrying the
    // order id so the return page knows which purchase it is looking at. The
    // id is a lookup key only — the return page re-checks the row's owner, and
    // settlement re-asks the gateway regardless.
    redirectUrl: `${returnUrlBase}?order=${encodeURIComponent(merchantOrderId)}`,
    description: `Mass Fitness — ${plan.label}, ${plan.durationLabel}`,
  });

  if (payment.providerOrderId) {
    await supabase
      .from("subscriptions")
      .update({ phonepe_txn_id: payment.providerOrderId })
      .eq("phonepe_merchant_txn_id", merchantOrderId);
  }

  return { redirectUrl: payment.redirectUrl, merchantOrderId };
}

export type SettleResult =
  | { outcome: "activated"; subscription: Subscription }
  | { outcome: "already_active"; subscription: Subscription }
  | { outcome: "pending" }
  | { outcome: "failed" }
  | { outcome: "unknown" };

/**
 * Settles a purchase against what the gateway says.
 *
 * Called from two places that race each other — the customer's return from the
 * gateway and PhonePe's webhook — which is why it is written to be safe to run
 * any number of times. The unique constraint on `phonepe_merchant_txn_id` plus
 * the `status = 'pending'` guard on the update mean that of two concurrent
 * callers exactly one activates and the other reads the row back as already
 * active. Neither extends the term twice.
 *
 * Note what is *not* an input: the redirect's query string, and the webhook's
 * body. Both are attacker-controllable — a member who can POST a "paid"
 * webhook to a route that believes it gets a free membership. The provider is
 * asked directly instead, every time.
 */
export async function settleCheckout(
  merchantOrderId: string,
): Promise<SettleResult> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("phonepe_merchant_txn_id", merchantOrderId)
    .maybeSingle();

  if (!existing) return { outcome: "unknown" };
  if (existing.status === "active") {
    return { outcome: "already_active", subscription: existing };
  }
  if (existing.status !== "pending") return { outcome: "failed" };

  const provider = getPaymentProvider();
  const status = await provider.getStatus(merchantOrderId);

  if (status.state === "pending") return { outcome: "pending" };
  if (status.state === "unknown") return { outcome: "unknown" };

  if (status.state === "failed") {
    // Cancelled rather than deleted: an abandoned checkout is a thing support
    // will be asked about, and a row that vanished cannot answer.
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("phonepe_merchant_txn_id", merchantOrderId)
      .eq("status", "pending");
    return { outcome: "failed" };
  }

  // Term length comes from the catalogue, not from a switch statement here.
  // This is the number a paying customer's access is measured in, and it had
  // a second definition that nothing kept in step with the first.
  const startDate = new Date();
  const endDate = addMonths(
    startDate,
    monthsForDuration(existing.plan_duration),
  );

  // The `.eq("status", "pending")` is the concurrency guard: whoever loses the
  // race updates zero rows and falls through to reading the active row back.
  const { data: activated } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      phonepe_txn_id: status.providerOrderId ?? existing.phonepe_txn_id,
      updated_at: new Date().toISOString(),
    })
    .eq("phonepe_merchant_txn_id", merchantOrderId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (activated) return { outcome: "activated", subscription: activated };

  const { data: current } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("phonepe_merchant_txn_id", merchantOrderId)
    .maybeSingle();

  return current?.status === "active"
    ? { outcome: "already_active", subscription: current }
    : { outcome: "unknown" };
}

// Re-exported so the one place that does have a Plan in hand (the /subscribe
// summary copy) can show the term end without duplicating the arithmetic.
export { termEndDate };
