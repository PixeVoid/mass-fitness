import { getPaymentProvider, settleCheckout } from "@/lib/payments/subscriptions";

/**
 * POST /api/payments/callback — PhonePe's server-to-server notification.
 *
 * A route handler rather than a Server Action because PhonePe posts to it, and
 * a gateway cannot invoke a Server Action.
 *
 * Two things this route deliberately does not do:
 *
 *  - It does not read a payment result out of the body. The body says what the
 *    sender wants it to say; `settleCheckout` re-asks PhonePe. The only thing
 *    taken from the request is which order to go and look up.
 *  - It does not return an error when settlement is inconclusive. PhonePe
 *    retries non-2xx, and a retry storm against an order that is simply still
 *    pending helps nobody. Anything we have understood gets a 200; only a body
 *    we could not parse at all is a 400.
 *
 * The signature check is defence in depth rather than the security boundary —
 * the boundary is that nothing here is believed without asking the gateway.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();

  const provider = getPaymentProvider();
  if (!provider.verifyWebhook(request.headers, rawBody)) {
    // Logged, not settled: an unverified caller could be someone probing, and
    // a genuine payment will be settled by the return page or a later retry
    // regardless. Never 500 here — that invites retries of a forged request.
    console.warn("[payments] rejected an unverified callback");
    return new Response(null, { status: 401 });
  }

  const merchantOrderId = extractOrderId(rawBody);
  if (!merchantOrderId) {
    console.error("[payments] callback with no recognisable order id");
    return new Response(null, { status: 400 });
  }

  try {
    const result = await settleCheckout(merchantOrderId);
    console.info("[payments] callback settled", merchantOrderId, result.outcome);
  } catch (error) {
    // Swallowed on purpose. The alternative is a non-2xx that makes PhonePe
    // retry, and every path into settlement is idempotent anyway — the return
    // page will finish the job.
    console.error("[payments] callback settle failed", merchantOrderId, error);
  }

  return new Response(null, { status: 200 });
}

/**
 * Digs our merchant order id out of the callback body.
 *
 * Tolerant by design: the payload has been nested differently across PhonePe's
 * API generations, and this route's whole job is to learn *which order to go
 * and check*. Being liberal about where that id sits costs nothing, because
 * the id alone grants nothing — settlement still asks the gateway.
 */
function extractOrderId(rawBody: string): string | null {
  try {
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const payload = (body.payload ?? body) as Record<string, unknown>;

    for (const key of ["merchantOrderId", "merchantTransactionId", "orderId"]) {
      const value = payload[key] ?? body[key];
      if (typeof value === "string" && value) return value;
    }
  } catch {
    // Not JSON, or not a shape we know.
  }
  return null;
}
