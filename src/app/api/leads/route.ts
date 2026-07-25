import * as z from "zod";
import { getClientIp } from "@/lib/chat/stream";
import { normalisePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/leads — contact capture from the anonymous "Get your AI
 * assessment" flow (/assessment).
 *
 * No session to key this off, so like /api/assessment it rate-limits by IP
 * rather than user id. Writes with the service role since `leads` has no
 * client insert policy — see supabase/migrations/0003_leads.sql.
 */

export const dynamic = "force-dynamic";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const bodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(20),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "invalid email",
    })
    .optional(),
  // Short excerpt of the chat, sent by the client so support has context —
  // never trusted beyond a length cap.
  summary: z.string().trim().max(2000).optional(),
  // Honeypot: a real visitor never sees or fills this field (off-screen in
  // the form). A bot filling every input does. Caught here rather than in the
  // schema so a hit still returns 200 — telling a bot it failed just teaches
  // it to leave the field blank.
  company: z.string().max(200).optional(),
});

function json(body: unknown, status: number, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(`leads:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
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

  if (parsed.data.company) {
    return json({ ok: true }, 200);
  }

  const phoneResult = normalisePhone(parsed.data.phone);
  if (!phoneResult.ok) {
    return json({ error: phoneResult.error }, 400);
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").insert({
    name: parsed.data.name,
    phone: phoneResult.phone,
    email: parsed.data.email || null,
    summary: parsed.data.summary || null,
  });

  if (error) {
    console.error("[leads] insert failed", error);
    return json({ error: "insert_failed" }, 500);
  }

  return json({ ok: true }, 200);
}
