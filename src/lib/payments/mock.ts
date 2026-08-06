import "server-only";

import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatus,
} from "@/lib/payments/provider";

/**
 * A gateway that always succeeds, for walking the flow without credentials.
 *
 * PhonePe will not issue keys until the merchant account exists, and the rest
 * of Phase 3 should not have to wait on paperwork to be testable. This stands
 * in: it "redirects" straight back to the return URL, and reports every order
 * as paid.
 *
 * Selected only when PAYMENT_PROVIDER is explicitly set to "mock", and it
 * refuses to load in production — a build that can hand out free memberships
 * because an env var was forgotten is not a risk worth carrying for the
 * convenience.
 */
export function createMockProvider(): PaymentProvider {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_MOCK_PAYMENTS) {
    throw new Error(
      "PAYMENT_PROVIDER=mock refuses to run in production. Set real PhonePe credentials, or set ALLOW_MOCK_PAYMENTS=1 if this is a staging deploy.",
    );
  }

  return {
    name: "mock",

    async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
      return {
        redirectUrl: input.redirectUrl,
        providerOrderId: `mock_${input.merchantOrderId}`,
      };
    },

    async getStatus(merchantOrderId: string): Promise<PaymentStatus> {
      return { state: "paid", providerOrderId: `mock_${merchantOrderId}` };
    },

    verifyWebhook(): boolean {
      return true;
    },
  };
}
