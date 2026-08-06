import "server-only";

/**
 * The payment provider seam (BUILD_PLAN Phase 3).
 *
 * Everything above this file — the /subscribe page, the pending-row
 * bookkeeping, the activation — is written against these three operations and
 * knows nothing about PhonePe. That matters for two reasons beyond tidiness:
 *
 *  1. PhonePe needs a registered merchant account (GST / business PAN) before
 *     it will issue live credentials. The `mock` provider below lets the whole
 *     flow — pick a plan, get redirected, come back, membership activates — be
 *     walked end to end today, while that paperwork is in progress.
 *  2. If PhonePe is ever swapped for Razorpay or Cashfree, it is this file's
 *     implementation that changes and nothing else.
 */

export interface CreatePaymentInput {
  /** Our idempotency key. Stored on the subscription row before we call out. */
  merchantOrderId: string;
  amountPaise: number;
  /** Where the gateway sends the customer's browser when they are done. */
  redirectUrl: string;
  /** Shown on the gateway's own page. */
  description: string;
}

export interface CreatePaymentResult {
  /** Where to send the browser to pay. */
  redirectUrl: string;
  /** The gateway's own id for this attempt, if it issues one up front. */
  providerOrderId: string | null;
}

/**
 * What the gateway says about an attempt when asked directly.
 *
 * "unknown" is distinct from "failed" on purpose: a status lookup that errors
 * must not be allowed to cancel a payment that may well have succeeded.
 */
export type PaymentState = "pending" | "paid" | "failed" | "unknown";

export interface PaymentStatus {
  state: PaymentState;
  providerOrderId: string | null;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /**
   * The authoritative answer, fetched from the gateway rather than read off a
   * redirect or a webhook body. Activation always goes through this.
   */
  getStatus(merchantOrderId: string): Promise<PaymentStatus>;
  /**
   * Whether an inbound webhook genuinely came from the gateway. Returning
   * false must never be treated as "not paid" — only as "don't trust this
   * request", which leaves the status lookup to settle it.
   */
  verifyWebhook(headers: Headers, rawBody: string): boolean;
}
