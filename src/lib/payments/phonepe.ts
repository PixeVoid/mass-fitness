import "server-only";

import { createHash } from "node:crypto";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentStatus,
} from "@/lib/payments/provider";

/**
 * PhonePe Standard Checkout.
 *
 * ⚠️ The wire details in this file — endpoint paths, field names, the shape of
 * the OAuth exchange — were written from the Standard Checkout v2 API and have
 * **not been exercised against a live PhonePe account**, because that needs
 * merchant credentials this project does not have yet. Check them against
 * PhonePe's current integration docs before taking real money. Everything
 * outside this file is provider-agnostic, so corrections land here alone.
 *
 * The design is deliberately tolerant of that uncertainty: activation never
 * reads a redirect query string or a webhook body, it re-asks PhonePe for the
 * order's status (`getStatus`). So a webhook whose signature scheme we have
 * wrong degrades to "the return page activates it a second later" rather than
 * to a member who paid and got nothing.
 */

const SANDBOX_BASE = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const PRODUCTION_BASE = "https://api.phonepe.com/apis/pg";

interface PhonePeConfig {
  clientId: string;
  clientSecret: string;
  clientVersion: string;
  /** Sandbox until a merchant account exists — see BUILD_PLAN Phase 3. */
  environment: "sandbox" | "production";
  /** Shared secret configured in the PhonePe dashboard for callbacks. */
  webhookUsername: string;
  webhookPassword: string;
}

/**
 * Cached across invocations of a warm lambda. PhonePe's tokens are valid for
 * long enough that re-minting one per payment is pure latency, and the token
 * endpoint is rate limited.
 */
let cachedToken: { value: string; expiresAtMs: number } | null = null;

/** Refresh a little early so a token cannot expire mid-request. */
const TOKEN_SKEW_MS = 60_000;

export function createPhonePeProvider(config: PhonePeConfig): PaymentProvider {
  const base =
    config.environment === "production" ? PRODUCTION_BASE : SANDBOX_BASE;

  async function accessToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAtMs - TOKEN_SKEW_MS > now) {
      return cachedToken.value;
    }

    const response = await fetch(`${base}/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_version: config.clientVersion,
        client_secret: config.clientSecret,
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      // Never surfaced to the caller: a gateway error body can echo our own
      // credentials back at us.
      console.error("[phonepe] token request failed", response.status);
      throw new Error("payment_provider_unavailable");
    }

    const body = (await response.json()) as {
      access_token?: string;
      expires_at?: number;
    };

    if (!body.access_token) throw new Error("payment_provider_unavailable");

    cachedToken = {
      value: body.access_token,
      // `expires_at` is epoch seconds. Falls back to a conservative 15 minutes
      // if the field is missing rather than caching something unbounded.
      expiresAtMs: body.expires_at ? body.expires_at * 1000 : now + 15 * 60_000,
    };

    return cachedToken.value;
  }

  return {
    name: "phonepe",

    async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
      const token = await accessToken();

      const response = await fetch(`${base}/checkout/v2/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantOrderId: input.merchantOrderId,
          amount: input.amountPaise,
          // A checkout left open forever is a pending row that never resolves.
          expireAfter: 20 * 60,
          paymentFlow: {
            type: "PG_CHECKOUT",
            message: input.description,
            merchantUrls: { redirectUrl: input.redirectUrl },
          },
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("[phonepe] create payment failed", response.status);
        throw new Error("payment_provider_unavailable");
      }

      const body = (await response.json()) as {
        orderId?: string;
        redirectUrl?: string;
      };

      if (!body.redirectUrl) throw new Error("payment_provider_unavailable");

      return {
        redirectUrl: body.redirectUrl,
        providerOrderId: body.orderId ?? null,
      };
    },

    async getStatus(merchantOrderId: string): Promise<PaymentStatus> {
      try {
        const token = await accessToken();
        const response = await fetch(
          `${base}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`,
          {
            headers: { Authorization: `O-Bearer ${token}` },
            cache: "no-store",
          },
        );

        if (!response.ok) {
          console.error("[phonepe] status lookup failed", response.status);
          return { state: "unknown", providerOrderId: null };
        }

        const body = (await response.json()) as {
          state?: string;
          orderId?: string;
        };

        return {
          state: mapState(body.state),
          providerOrderId: body.orderId ?? null,
        };
      } catch {
        // Unknown, never failed — see the PaymentState comment. Cancelling a
        // membership because our own network hiccuped is the worst outcome
        // available here.
        return { state: "unknown", providerOrderId: null };
      }
    },

    verifyWebhook(headers: Headers): boolean {
      const provided = headers.get("authorization");
      if (!provided) return false;

      // PhonePe authenticates callbacks with SHA256(username:password) over
      // the credentials configured in their dashboard, sent in Authorization.
      const expected = createHash("sha256")
        .update(`${config.webhookUsername}:${config.webhookPassword}`)
        .digest("hex");

      return timingSafeEqualHex(provided.trim().toLowerCase(), expected);
    },
  };
}

function mapState(state: string | undefined): PaymentStatus["state"] {
  switch (state) {
    case "COMPLETED":
      return "paid";
    case "FAILED":
      return "failed";
    case "PENDING":
      return "pending";
    default:
      return "unknown";
  }
}

/**
 * Constant-time compare over two hex strings. `===` on a secret leaks its
 * prefix through timing; the difference is small but it is free to avoid.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
