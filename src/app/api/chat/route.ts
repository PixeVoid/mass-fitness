import * as z from "zod";
import { getUser } from "@/lib/auth/dal";
import { SYSTEM_PROMPT } from "@/lib/chat/prompt";
import { streamCompletion } from "@/lib/chat/stream";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/chat — the fitness assistant (BUILD_PLAN Phase 5).
 *
 * The provider key never leaves the server; the browser only ever talks to
 * this route. Requests use the OpenAI-compatible chat-completions shape, so
 * moving off Groq is a change to CHAT_API_BASE_URL and CHAT_MODEL rather than
 * a rewrite.
 *
 * Responds with a plain `text/plain` stream of token deltas. Parsing the
 * provider's SSE here rather than forwarding it means the client is a
 * `for await` over text, and the wire format stays ours if the provider's
 * changes.
 */

export const dynamic = "force-dynamic";

/** Per user, per window. Generous for a human, ruinous for a script. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Only the tail of the conversation is forwarded. Caps token spend and stops a
 * client replaying a huge history to run up the bill. The system prompt is
 * always prepended server-side — a client-supplied one is discarded.
 */
const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 2000;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(50),
});

function json(body: unknown, status: number, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

export async function POST(request: Request) {
  // Auth-gated so the quota is spent on members, and so an abusive caller is
  // an identifiable row rather than an IP.
  const user = await getUser();
  if (!user) {
    return json({ error: "unauthenticated" }, 401);
  }

  const limit = rateLimit(`chat:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
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
  const lastUserMessage =
    [...history].reverse().find((m) => m.role === "user")?.content ?? "";

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
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        temperature: 0.6,
        max_tokens: 600,
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
      "[chat] provider error",
      upstream.status,
      await upstream.text().catch(() => ""),
    );
    return json({ error: "provider_error" }, 502);
  }

  const stream = streamCompletion(upstream.body, async (answer) => {
    if (!serverEnv.chatLogEnabled) return;
    await logExchange(user.id, lastUserMessage, answer);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Stops nginx-style proxies from buffering the stream into one blob.
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Written with the service role because chat_logs has no client insert policy:
 * support needs to read these, and a user must not be able to forge them.
 * Gated behind CHAT_LOG_ENABLED (BUILD_PLAN open flag 3).
 */
async function logExchange(userId: string, message: string, response: string) {
  if (!message) return;

  const supabase = createAdminClient();
  await supabase.from("chat_logs").insert({
    user_id: userId,
    message,
    response: response || null,
  });
}
