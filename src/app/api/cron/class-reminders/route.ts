import { buildClassReminderEmail } from "@/lib/classes/reminderEmail";
import { classJoinWindow, formatClassTime } from "@/lib/classes";
import { sendEmail } from "@/lib/email/resend";
import { publicEnv, serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET/POST /api/cron/class-reminders — emails members shortly before a class.
 *
 * **Scheduler-agnostic on purpose.** It is a plain authenticated endpoint, so
 * it can be driven by Vercel Cron, by pg_cron + pg_net from Supabase, by a
 * GitHub Action, or by curl from anywhere. That matters because Vercel's Hobby
 * plan only allows daily crons, which is useless for a 30-minute reminder —
 * tying this to one scheduler would have quietly made the feature depend on a
 * billing tier. Run it every 5 minutes from whatever you have.
 *
 * Safe to run at any frequency: `class_reminders` has a composite primary key
 * and the insert is the claim. Two overlapping runs cannot both send.
 */

export const dynamic = "force-dynamic";

/**
 * How far ahead to look. Deliberately wider than the intended 30 minutes: a
 * scheduler that runs every 5 minutes, or misses a beat entirely, must not
 * leave a class un-notified because its exact moment fell in a gap. Sending 40
 * minutes early instead of 30 is invisible to a member; sending nothing is
 * the failure that matters.
 */
const LOOKAHEAD_MINUTES = 40;

/**
 * How far back to look. Covers a scheduler outage of up to an hour without
 * emailing people about a class that has already finished — the class must
 * still be joinable for the email to be worth sending.
 */
const LOOKBACK_MINUTES = 60;

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  if (!isAuthorised(request)) {
    return Response.json({ error: "unauthorised" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = Date.now();

  // Classes whose start falls inside the window. Both bounds matter: without
  // the lower one, a scheduler that had been down for a day would email
  // everybody about every class it had missed.
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("*")
    .in("status", ["scheduled", "live"])
    .gte("scheduled_at", new Date(now - LOOKBACK_MINUTES * 60_000).toISOString())
    .lte("scheduled_at", new Date(now + LOOKAHEAD_MINUTES * 60_000).toISOString());

  if (classesError) {
    console.error("[reminders] could not read classes", classesError);
    return Response.json({ error: "lookup_failed" }, { status: 500 });
  }

  if (!classes || classes.length === 0) {
    return Response.json({ classes: 0, sent: 0 });
  }

  // Everyone with a live membership. Read once for the whole run rather than
  // per class — the same handful of people are eligible for all of them, and
  // a class list is short.
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("status", "active")
    .gt("end_date", new Date(now).toISOString());

  const memberIds = [...new Set((subscriptions ?? []).map((s) => s.user_id))];
  if (memberIds.length === 0) {
    return Response.json({ classes: classes.length, sent: 0 });
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", memberIds);

  const recipients = (profiles ?? []).filter(
    (profile): profile is typeof profile & { email: string } =>
      typeof profile.email === "string" && profile.email.includes("@"),
  );

  let sent = 0;
  let failed = 0;

  for (const fitnessClass of classes) {
    // The window is the same one the dashboard and the token route use, so a
    // reminder can never point at a room that will refuse the recipient.
    const { closesAtMs } = classJoinWindow(fitnessClass);
    if (closesAtMs <= now) continue;

    const formattedTime = formatClassTime(fitnessClass.scheduled_at);
    const joinUrl = `${publicEnv.siteUrl}/live/${fitnessClass.id}`;

    for (const profile of recipients) {
      // The claim, not a log. Whoever inserts the row owns the send; a
      // concurrent run's insert violates the primary key and it skips. This is
      // why the insert happens *before* the email rather than after — the
      // reverse would let two runs both decide to send.
      const { error: claimError } = await supabase
        .from("class_reminders")
        .insert({
          class_id: fitnessClass.id,
          user_id: profile.id,
          kind: "starting_soon",
        });

      // 23505 is the unique violation: already claimed, nothing to do.
      if (claimError) {
        if (claimError.code !== "23505") {
          console.error("[reminders] claim failed", claimError);
        }
        continue;
      }

      const { subject, html } = buildClassReminderEmail({
        name: profile.name?.split(/\s+/)[0] ?? "there",
        title: fitnessClass.title,
        trainerName: fitnessClass.trainer_name,
        formattedTime,
        durationMinutes: fitnessClass.duration_minutes,
        joinUrl,
      });

      const result = await sendEmail({ to: profile.email, subject, html });

      if (result.ok) {
        sent += 1;
      } else {
        failed += 1;
        // Release the claim so the next run retries. Leaving it in place would
        // mean a single provider blip permanently silenced this reminder.
        await supabase
          .from("class_reminders")
          .delete()
          .eq("class_id", fitnessClass.id)
          .eq("user_id", profile.id)
          .eq("kind", "starting_soon");
      }
    }
  }

  console.info("[reminders] run complete", {
    classes: classes.length,
    sent,
    failed,
  });

  return Response.json({ classes: classes.length, sent, failed });
}

/**
 * A shared secret in the Authorization header.
 *
 * Not optional-if-unset: an unauthenticated endpoint that emails your whole
 * membership is a spam cannon anyone can point at your customers. With no
 * secret configured this refuses every request, which is the right failure —
 * a silent no-op is better than an open one.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically; any
 * other scheduler can set the same header.
 */
function isAuthorised(request: Request): boolean {
  const expected = serverEnv.cronSecret;
  if (!expected) {
    console.error("[reminders] CRON_SECRET is not set — refusing to run");
    return false;
  }

  const provided = request.headers.get("authorization") ?? "";
  const token = provided.startsWith("Bearer ")
    ? provided.slice(7)
    : provided;

  return timingSafeEqual(token, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
