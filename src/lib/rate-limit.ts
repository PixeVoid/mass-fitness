import "server-only";

/**
 * Fixed-window rate limiter, in process memory.
 *
 * Deliberately the simplest thing that stops one logged-in user burning the
 * whole Groq quota. Its limits are real and worth knowing:
 *
 *  - Per instance. On Vercel each lambda has its own map, so the effective
 *    ceiling is roughly limit x concurrent instances.
 *  - Lost on cold start.
 *
 * That is adequate for abuse from a signed-in member and inadequate as a
 * defence against a distributed attack. Move to Upstash Redis (or Supabase, at
 * the cost of a round trip per message) if the chatbot ever gets opened to
 * anonymous users.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Cheap sweep so the map cannot grow without bound on a long-lived instance. */
function evictExpired(now: number) {
  if (windows.size < 1000) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets — goes straight into Retry-After. */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  evictExpired(now);

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const retryAfter = Math.ceil((existing.resetAt - now) / 1000);

  if (existing.count > limit) {
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: limit - existing.count, retryAfter };
}
