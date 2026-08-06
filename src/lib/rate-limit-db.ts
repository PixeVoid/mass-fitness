import "server-only";

import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limiting that survives a cold start and is shared across instances.
 *
 * The in-process version (`lib/rate-limit.ts`) gives every serverless instance
 * its own counter, so the real ceiling was `limit x concurrent instances` and
 * it reset whenever a lambda recycled — a speed bump, not a limit. This counts
 * in Postgres, in one statement, so two simultaneous requests cannot both read
 * the same "before" value.
 *
 * The identifier is **hashed with a server-side secret and never stored raw**.
 * Recognising the same caller within a window is all this needs; keeping the
 * address itself would be storing personal data for no additional benefit.
 */

export interface DbRateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. Goes straight into Retry-After. */
  retryAfter: number;
}

export async function rateLimitDb(
  /** Namespace, so two endpoints keyed on the same IP do not share a budget. */
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<DbRateLimitResult> {
  const bucket = hashBucket(scope, identifier);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("bump_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_sec: windowSeconds,
    });

    if (error || !data || data.length === 0) {
      console.error("[rate-limit] bump failed", error);
      // Failing closed would take the endpoint down with the database, and
      // failing open costs at most one window of requests during an outage.
      return { allowed: true, retryAfter: 0 };
    }

    const row = data[0];
    return {
      allowed: row.allowed,
      retryAfter: row.allowed ? 0 : row.retry_after,
    };
  } catch (error) {
    console.error("[rate-limit] bump threw", error);
    return { allowed: true, retryAfter: 0 };
  }
}

/**
 * Salted so the stored value cannot be reversed by hashing candidate
 * addresses — an unsalted SHA-256 of an IPv4 address is trivially brute
 * forced, there being only four billion of them.
 *
 * Falls back to the service-role key as the salt when no dedicated secret is
 * set. That key is server-only and already required for this code path to run
 * at all, so it is a reasonable default and never a reason to store raw IPs.
 */
function hashBucket(scope: string, identifier: string): string {
  const salt = serverEnv.cronSecret || serverEnv.supabaseServiceRoleKey;
  return createHash("sha256")
    .update(`${salt}:${scope}:${identifier}`)
    .digest("hex");
}
