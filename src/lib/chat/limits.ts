import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Abuse protection for the assistant.
 *
 * The previous limiter lived in a module-level Map. On Vercel each lambda has
 * its own, so the real ceiling was `limit x concurrent instances` and it reset
 * on every cold start — which is to say it was a speed bump, not a limit.
 * These counts come from `chat_logs`, so they are shared by every instance and
 * survive restarts. The log is therefore load-bearing, not optional: it is
 * both the audit record and the quota ledger.
 *
 * Four rules, because each one closes a hole the others leave open:
 *
 *  - BURST stops a script hammering the endpoint.
 *  - DAILY is what actually bounds the bill. A burst limit alone permits
 *    BURST_LIMIT every window all day — 5,760 messages, on the old numbers.
 *  - DUPLICATE kills the cheapest abuse there is: holding down send on the
 *    same string. It costs nothing to check and it is the pattern a bored
 *    user falls into first.
 *  - MIN_CHARS keeps "k", "ok" and "..." from reaching a paid provider.
 *
 * All four are enforced from a single query, because the day's rows contain
 * everything needed to evaluate the burst window and the last message too.
 */

/** Per rolling window. Generous for a person, useless to a script. */
export const BURST_LIMIT = 20;
export const BURST_WINDOW_MS = 5 * 60 * 1000;

/** The ceiling that bounds spend. Far above real use, far below a runaway. */
export const DAILY_LIMIT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Repeating yourself is allowed — just not instantly, and not on a loop. */
const DUPLICATE_WINDOW_MS = 60 * 1000;

/** Below this a message cannot be a question worth paying to answer. */
export const MIN_MESSAGE_CHARS = 3;

export type QuotaVerdict =
  | { allowed: true }
  | {
      allowed: false;
      /** Machine-readable; the widget maps these to copy. */
      reason: "rate_limited" | "daily_limit" | "duplicate" | "too_short";
      /** Seconds until it is worth retrying. Goes straight into Retry-After. */
      retryAfter: number;
    };

/**
 * Decides whether this message may be sent, before a paid token is spent on
 * it. Reads with the service role because `chat_logs` has no client-side
 * policy at all — a user must not be able to read, forge or delete the rows
 * their own quota is counted from.
 */
export async function checkChatQuota(
  userId: string,
  message: string,
): Promise<QuotaVerdict> {
  const trimmed = message.trim();
  if (trimmed.length < MIN_MESSAGE_CHARS) {
    return { allowed: false, reason: "too_short", retryAfter: 0 };
  }

  const now = Date.now();
  const supabase = createAdminClient();

  // One round trip covers all three windows: the day's rows are a superset of
  // the burst window's, and the newest of them is the duplicate check.
  // Capped at DAILY_LIMIT + 1 — past that the exact count is irrelevant, only
  // that it is over.
  const { data, error } = await supabase
    .from("chat_logs")
    .select("message, created_at")
    .eq("user_id", userId)
    .gte("created_at", new Date(now - DAY_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(DAILY_LIMIT + 1);

  if (error) {
    // Failing closed would take the assistant down with the database, and
    // failing open costs at most one message per outage — the row this
    // request writes will be counted by the next one either way.
    console.error("[chat] quota lookup failed", error);
    return { allowed: true };
  }

  const rows = data ?? [];

  if (rows.length >= DAILY_LIMIT) {
    const oldest = rows[rows.length - 1];
    return {
      allowed: false,
      reason: "daily_limit",
      // When the oldest counted message ages out of the 24h window.
      retryAfter: secondsUntil(
        new Date(oldest.created_at).getTime() + DAY_MS,
        now,
      ),
    };
  }

  const newest = rows[0];
  if (
    newest &&
    newest.message.trim() === trimmed &&
    now - new Date(newest.created_at).getTime() < DUPLICATE_WINDOW_MS
  ) {
    return {
      allowed: false,
      reason: "duplicate",
      retryAfter: secondsUntil(
        new Date(newest.created_at).getTime() + DUPLICATE_WINDOW_MS,
        now,
      ),
    };
  }

  const burstStart = now - BURST_WINDOW_MS;
  const burst = rows.filter(
    (row) => new Date(row.created_at).getTime() >= burstStart,
  );

  if (burst.length >= BURST_LIMIT) {
    const oldestInBurst = burst[burst.length - 1];
    return {
      allowed: false,
      reason: "rate_limited",
      retryAfter: secondsUntil(
        new Date(oldestInBurst.created_at).getTime() + BURST_WINDOW_MS,
        now,
      ),
    };
  }

  return { allowed: true };
}

/**
 * Records the attempt and returns its row id.
 *
 * Written *before* the provider is called, deliberately. Logging on completion
 * would mean a client that opens a request and immediately aborts is never
 * counted — so the cheapest way to burn the quota would be to never read the
 * answer. Charging on attempt closes that, and it also means an abusive
 * session is visible in the table while it is happening rather than after.
 */
export async function logAttempt(
  userId: string,
  message: string,
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("chat_logs")
    .insert({ user_id: userId, message, response: null })
    .select("id")
    .single();

  if (error) {
    console.error("[chat] failed to log attempt", error);
    return null;
  }

  return data.id;
}

/** Fills in the answer once the stream closes. Best effort by design. */
export async function logAnswer(logId: string, answer: string): Promise<void> {
  if (!answer) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("chat_logs")
    .update({ response: answer })
    .eq("id", logId);

  if (error) console.error("[chat] failed to log answer", error);
}

function secondsUntil(target: number, now: number): number {
  return Math.max(1, Math.ceil((target - now) / 1000));
}
