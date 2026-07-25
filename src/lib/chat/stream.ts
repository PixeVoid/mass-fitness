import "server-only";

/**
 * Shared plumbing for the two chat-style routes (`/api/chat`, `/api/assessment`).
 * Both talk to the same OpenAI-compatible provider and need the same SSE ->
 * plain-text-delta translation, so it lives here once rather than twice.
 */

/**
 * Turns the provider's SSE stream into plain text deltas, calling `onComplete`
 * with the full answer once upstream closes.
 */
export function streamCompletion(
  body: ReadableStream<Uint8Array>,
  onComplete: (answer: string) => Promise<void>,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = body.getReader();

  let buffer = "";
  let answer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();

      if (done) {
        await onComplete(answer).catch((error) => {
          // Logging is a side concern; never fail a delivered answer over it.
          console.error("[chat] failed to log exchange", error);
        });
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line; a chunk can split one in
      // half, so the trailing partial stays in the buffer for the next read.
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        for (const line of event.split("\n")) {
          if (!line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const chunk = JSON.parse(data);
            const delta = chunk?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              answer += delta;
              controller.enqueue(encoder.encode(delta));
            }
          } catch {
            // A malformed chunk is not worth killing a live answer over.
          }
        }
      }
    },
    cancel(reason) {
      // Client navigated away — stop pulling so we're not billed for tokens
      // nobody will read.
      void reader.cancel(reason);
    },
  });
}

/**
 * Best-effort caller IP for rate-limiting anonymous requests. Vercel (and most
 * proxies) set `x-forwarded-for` to "client, proxy1, proxy2" — the first entry
 * is the one that matters. Falls back to a constant bucket if neither header
 * is present, which only happens off Vercel in local dev.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  return "unknown";
}
