import * as z from "zod";
import { ASSESSMENT_SYSTEM_PROMPT } from "@/lib/chat/assessmentPrompt";
import { getClientIp, streamCompletion } from "@/lib/chat/stream";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/assessment — the anonymous lead-gen chat behind "Get your AI
 * assessment" on the landing page.
 *
 * Deliberately not `/api/chat`: that route is auth-gated by design (BUILD_PLAN
 * Phase 5 — the quota is spent on members, and abuse is an identifiable row).
 * This one exists specifically to run *before* signup, so it can't lean on a
 * user id. It shares the streaming plumbing but gets its own IP-keyed rate
 * limit, its own (tighter) history cap, and its own system prompt.
 *
 * Known limit: the rate limiter is in-process memory, so the real ceiling is
 * roughly RATE_LIMIT x concurrent lambda instances, and it resets on cold
 * start — same caveat as /api/chat, just now actually biting since this route
 * is open to anonymous traffic. Move to Upstash Redis if abuse shows up.
 */

export const dynamic = "force-dynamic";

const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const MAX_HISTORY = 10;
const MAX_MESSAGE_CHARS = 800;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(30),
});

function json(body: unknown, status: number, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`assessment:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return json({ error: "rate_limited" }, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "invalid_body" }, 400);
  }

  const history = parsed.data.messages.slice(-MAX_HISTORY);

  let upstream: Response;
  try {
    upstream = await fetch(`${serverEnv.chatBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverEnv.groqApiKey}`,
      },
      body: JSON.stringify({
        model: serverEnv.chatModel,
        messages: [
          { role: "system", content: ASSESSMENT_SYSTEM_PROMPT },
          ...history,
        ],
        temperature: 0.6,
        max_tokens: 500,
        stream: true,
      }),
    });
  } catch {
    return json({ error: "provider_unreachable" }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    // The provider's error body can quote our request back — never forward it
    // to the client. Log it, return a generic failure.
    console.error(
      "[assessment] provider error",
      upstream.status,
      await upstream.text().catch(() => ""),
    );
    return json({ error: "provider_error" }, 502);
  }

  const stream = streamCompletion(upstream.body, async () => {});

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
