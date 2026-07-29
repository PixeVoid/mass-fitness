import * as z from "zod";
import { getClientIp } from "@/lib/chat/stream";
import { rateLimit } from "@/lib/rate-limit";
import { normalisePhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreAssessment } from "@/lib/assessment/scoring";
import { renderAssessmentReportPdf } from "@/lib/assessment/pdf";
import { buildResultEmailHtml } from "@/lib/assessment/emailTemplate";
import { buildWhatsAppResultLink } from "@/lib/assessment/whatsapp";
import { sendEmail } from "@/lib/email/resend";
import type { AssessmentAnswers } from "@/lib/assessment/types";

/**
 * POST /api/assessment — submits the 15-question self-assessment
 * (BUILD_PLAN Phase 5.5, replacing the earlier free-form AI chat).
 *
 * One request does four things: score the answers server-side (never trust
 * a client-computed score), save a lead, render a PDF report, and email it.
 * WhatsApp delivery is a prefilled wa.me link the client opens — full
 * Business API automation needs Meta verification and an approved template,
 * so it's deferred; see buildWhatsAppResultLink.
 *
 * No session to key this off (same as the old chat flow), so it rate-limits
 * by IP plus a honeypot field, matching the retired /api/leads route.
 */

export const dynamic = "force-dynamic";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const answersSchema = z.object({
  age: z.coerce.number().int().min(13).max(100),
  gender: z.enum(["male", "female", "unspecified"]),
  heightCm: z.coerce.number().min(100).max(250),
  weightKg: z.coerce.number().min(30).max(300),

  goal: z.enum([
    "lose_weight",
    "build_muscle",
    "general_fitness",
    "stamina",
    "health_condition",
  ]),
  barrier: z.enum(["time", "motivation", "no_structure", "no_results_before", "injury"]),

  activityLevel: z.enum(["sedentary", "light", "moderate", "very_active"]),
  routine: z.enum(["none", "occasional", "plateaued", "progressing"]),
  sleepHours: z.enum(["under_5", "5_6", "7_8", "8_plus"]),

  diet: z.enum(["home_cooked", "mixed", "mostly_outside", "irregular"]),
  dietaryPreference: z.enum(["vegetarian", "non_vegetarian", "eggetarian", "vegan"]),

  toeTouch: z.enum(["yes", "difficulty", "no"]).optional(),
  pushups: z.enum(["0_5", "6_15", "16_25", "25_plus"]).optional(),
  squats30s: z.enum(["under_10", "10_20", "20_30", "30_plus"]).optional(),
  stairsBreath: z
    .enum(["very_winded", "somewhat_winded", "barely_winded", "not_at_all"])
    .optional(),
}) satisfies z.ZodType<AssessmentAnswers>;

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
  answers: answersSchema,
  // Honeypot — a real visitor never sees this field. Caught after parsing so
  // a bot hit still returns 200, teaching it nothing about why it failed.
  company: z.string().max(200).optional(),
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

  if (parsed.data.company) {
    return json({ ok: true }, 200);
  }

  const phoneResult = normalisePhone(parsed.data.phone);
  if (!phoneResult.ok) {
    return json({ error: phoneResult.error }, 400);
  }

  const result = scoreAssessment(parsed.data.answers);

  const supabase = createAdminClient();
  const { error: insertError } = await supabase.from("leads").insert({
    name: parsed.data.name,
    phone: phoneResult.phone,
    email: parsed.data.email || null,
    summary: `${result.band} (${result.total}/100) — recommended ${result.tierNudge}`,
    source: "self_assessment",
    score: result.total,
    band: result.band,
    tier_nudge: result.tierNudge,
    answers: parsed.data.answers,
  });

  if (insertError) {
    console.error("[assessment] lead insert failed", insertError);
    return json({ error: "insert_failed" }, 500);
  }

  let pdfBase64: string | null = null;
  try {
    const pdf = await renderAssessmentReportPdf({
      name: parsed.data.name,
      answers: parsed.data.answers,
      result,
    });
    pdfBase64 = pdf.toString("base64");
  } catch (error) {
    // The lead is already saved and the score is already computed — a PDF
    // render failure shouldn't blank the whole result screen.
    console.error("[assessment] pdf render failed", error);
  }

  let emailSent = false;
  if (parsed.data.email && pdfBase64) {
    const sent = await sendEmail({
      to: parsed.data.email,
      subject: `Your Mass Fitness self-assessment — ${result.total}/100`,
      html: buildResultEmailHtml(parsed.data.name, result),
      attachment: {
        filename: "mass-fitness-assessment.pdf",
        content: Buffer.from(pdfBase64, "base64"),
      },
    }).catch((error) => {
      // Missing RESEND_API_KEY throws here rather than returning a result —
      // treat that the same as a provider failure: log it, don't fail the
      // request. The client still gets the score, the PDF and the WhatsApp
      // link either way.
      console.error("[assessment] email send threw", error);
      return { ok: false as const, error: "config" };
    });
    emailSent = sent.ok;
  }

  return json(
    {
      ok: true,
      score: result.total,
      band: result.band,
      bandCopy: result.bandCopy,
      breakdown: result.breakdown,
      tierNudge: result.tierNudge,
      healthFlag: result.healthFlag,
      bmi: result.bmi,
      emailSent,
      pdfBase64,
      whatsappUrl: buildWhatsAppResultLink(parsed.data.name, result),
    },
    200,
  );
}
