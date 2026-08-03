/**
 * Env access with a real error message.
 *
 * `process.env.FOO!` reads fine but fails as `undefined is not a string` deep
 * inside a vendor SDK. These helpers fail at the point of use naming the
 * variable, which is the difference between a five-second and a fifty-minute
 * deploy debug.
 *
 * Server-only values are read lazily rather than at module load: a missing
 * LiveKit key should break the LiveKit route, not the whole build.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. See .env.example for what it should hold.`,
    );
  }
  return value;
}

/**
 * Public values are inlined at build time, so they must be referenced as
 * literal `process.env.NEXT_PUBLIC_*` expressions — a dynamic lookup gets
 * nothing on the client.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "",
  // Used to build the Google OAuth redirect URL. Reading it from a header on
  // the incoming request would also work, but a header can be spoofed by
  // whoever sends the request (Host, X-Forwarded-Host) — an attacker-supplied
  // value there would send Google's callback to a domain of their choosing.
  // An env var is fixed at deploy time.
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export function assertPublicSupabaseEnv(): { url: string; anonKey: string } {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. See .env.example.",
    );
  }
  return { url: publicEnv.supabaseUrl, anonKey: publicEnv.supabaseAnonKey };
}

export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get livekitApiKey() {
    return required("LIVEKIT_API_KEY");
  },
  get livekitApiSecret() {
    return required("LIVEKIT_API_SECRET");
  },
  get livekitUrl() {
    return required("NEXT_PUBLIC_LIVEKIT_URL");
  },
  get groqApiKey() {
    return required("GROQ_API_KEY");
  },
  /**
   * Base URL and model are configurable so swapping Groq for OpenRouter or any
   * other OpenAI-compatible provider is a env change, not a code change
   * (BUILD_PLAN section 0, chatbot row).
   */
  get chatBaseUrl() {
    return process.env.CHAT_API_BASE_URL ?? "https://api.groq.com/openai/v1";
  },
  get chatModel() {
    return process.env.CHAT_MODEL ?? "llama-3.3-70b-versatile";
  },
  /**
   * Payments (Phase 3). "mock" walks the whole flow without credentials while
   * the PhonePe merchant account is being registered — see lib/payments/mock.
   */
  get paymentProvider(): "phonepe" | "mock" {
    return process.env.PAYMENT_PROVIDER === "mock" ? "mock" : "phonepe";
  },
  get phonePeClientId() {
    return required("PHONEPE_CLIENT_ID");
  },
  get phonePeClientSecret() {
    return required("PHONEPE_CLIENT_SECRET");
  },
  get phonePeClientVersion() {
    return process.env.PHONEPE_CLIENT_VERSION ?? "1";
  },
  /** Sandbox unless explicitly switched — never default to charging real cards. */
  get phonePeEnvironment(): "sandbox" | "production" {
    return process.env.PHONEPE_ENVIRONMENT === "production"
      ? "production"
      : "sandbox";
  },
  get phonePeWebhookUsername() {
    return required("PHONEPE_WEBHOOK_USERNAME");
  },
  get phonePeWebhookPassword() {
    return required("PHONEPE_WEBHOOK_PASSWORD");
  },

  /** Self-assessment result emails (Phase 5.5). Resend's free tier covers MVP volume. */
  get resendApiKey() {
    return required("RESEND_API_KEY");
  },
  /** "Name <address>" shown as the sender — must be a domain verified in Resend. */
  get resendFromAddress() {
    return process.env.RESEND_FROM_EMAIL ?? "Mass Fitness <onboarding@resend.dev>";
  },
};
