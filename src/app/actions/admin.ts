"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { PLAN_DURATIONS, PLAN_TIERS, termEndDate } from "@/lib/plans";
import { getPlan } from "@/lib/pricing";
import {
  MAX_WEEKS,
  buildRecurrence,
  parseIstLocal,
  type Weekday,
} from "@/lib/schedule";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin mutations (BUILD_PLAN Phase 6).
 *
 * Every action starts with `requireAdmin()`. Server Actions are public
 * endpoints — anyone who can read the page bundle can find the action id and
 * POST to it directly, so "only admins see the button" is not a check.
 *
 * Writes split by whether RLS has a policy for them:
 *   - classes      → user client, because the "classes: admin write" policy
 *                    covers it and the database re-verifies the caller.
 *   - roles, subs  → service role, because there is deliberately no policy
 *                    (roles are pinned; subscriptions are read-only to users).
 */

export interface ActionState {
  error?: string;
  success?: string;
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["member", "trainer", "admin"]),
});

export async function setUserRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = roleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: "Invalid role change." };
  }

  // Losing your own admin rights mid-session is not a recoverable mistake
  // through this UI — it would take another admin, or SQL, to undo.
  if (parsed.data.userId === admin.id && parsed.data.role !== "admin") {
    return { error: "You can't remove your own admin access." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);

  if (error) {
    return { error: "Couldn't update the role." };
  }

  revalidatePath("/admin/members");
  return { success: `Role set to ${parsed.data.role}.` };
}

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------

const grantSchema = z.object({
  userId: z.string().uuid(),
  planTier: z.enum(PLAN_TIERS),
  planDuration: z.enum(PLAN_DURATIONS),
  // Rupees in the form, paise in the database. Admins think in rupees.
  amountRupees: z.coerce.number().int().min(0).max(1_000_000),
});

/**
 * Manually grant a membership — the stand-in for Phase 3's payment callback,
 * and the way to record a payment taken over UPI or in cash.
 *
 * Deliberately additive: it inserts a new subscription rather than editing an
 * existing one, so the history of what a member was given, and when, survives.
 * `getActiveSubscription()` reads the latest-ending row, so a new grant
 * supersedes an older one without deleting it.
 */
export async function grantMembership(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = grantSchema.safeParse({
    userId: formData.get("userId"),
    planTier: formData.get("planTier"),
    planDuration: formData.get("planDuration"),
    amountRupees: formData.get("amountRupees"),
  });
  if (!parsed.success) {
    return { error: "Check the plan and amount." };
  }

  const plan = await getPlan(parsed.data.planTier, parsed.data.planDuration);
  const start = new Date();

  const supabase = createAdminClient();
  const { error } = await supabase.from("subscriptions").insert({
    user_id: parsed.data.userId,
    plan_tier: plan.tier,
    plan_duration: plan.duration,
    amount_paise: parsed.data.amountRupees * 100,
    status: "active",
    start_date: start.toISOString(),
    end_date: termEndDate(plan, start).toISOString(),
  });

  if (error) {
    return { error: "Couldn't grant the membership." };
  }

  revalidatePath("/admin/members");
  revalidatePath("/dashboard");
  return {
    success: `${plan.label} · ${plan.durationLabel} granted until ${termEndDate(plan, start).toLocaleDateString("en-IN")}.`,
  };
}

const cancelSchema = z.object({ subscriptionId: z.string().uuid() });

export async function cancelMembership(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = cancelSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
  });
  if (!parsed.success) {
    return { error: "Invalid subscription." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.subscriptionId);

  if (error) {
    return { error: "Couldn't cancel the membership." };
  }

  revalidatePath("/admin/members");
  revalidatePath("/dashboard");
  return { success: "Membership cancelled." };
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

const classSchema = z.object({
  // Mirrors the coach form. Without this every admin-created class was open to
  // every member — including one-to-one members, who are not meant to have
  // group sessions at all.
  audience: z.enum(["all", "groups"]).default("all"),
  groupIds: z.array(z.string().uuid()).default([]),
  title: z.string().trim().min(2, "Give the class a title.").max(120),
  trainerId: z.string().uuid().optional().or(z.literal("")),
  // datetime-local submits "2026-07-26T07:00" with no timezone. It is read as
  // IST — see lib/schedule. It used to be handed to `new Date()`, which parses
  // in the *server's* zone: on Vercel that is UTC, so a 7:00am class was being
  // stored as 7:00am UTC and shown to members as 12:30pm.
  scheduledAt: z.string().min(1, "Pick a date and time."),
  durationMinutes: z.coerce.number().int().min(5).max(240),
  isPremium: z.union([z.literal("on"), z.literal("")]).optional(),
  // Repeat controls. Absent means a single class, which is what every
  // existing caller sends.
  repeatWeeks: z.coerce.number().int().min(1).max(MAX_WEEKS).default(1),
  repeatDays: z
    .array(z.coerce.number().int().min(0).max(6))
    .default([])
    .transform((days) => days as Weekday[]),
});

export async function createClass(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = classSchema.safeParse({
    title: formData.get("title"),
    trainerId: formData.get("trainerId"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    isPremium: formData.get("isPremium") ?? "",
    audience: formData.get("audience") ?? "all",
    groupIds: formData.getAll("groupIds").map(String),
    repeatWeeks: formData.get("repeatWeeks") ?? 1,
    repeatDays: formData.getAll("repeatDays").map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  if (parsed.data.audience === "groups" && parsed.data.groupIds.length === 0) {
    return { error: "Pick at least one group, or open it to everyone." };
  }

  const scheduledAt = parseIstLocal(parsed.data.scheduledAt);
  if (!scheduledAt) {
    return { error: "That date didn't parse." };
  }

  const occurrences = buildRecurrence({
    first: scheduledAt,
    weekdays: parsed.data.repeatDays,
    weeks: parsed.data.repeatWeeks,
  });

  // Only a repeating routine gets a series id. A one-off with a null series
  // reads correctly in the admin list without a special case.
  const seriesId = occurrences.length > 1 ? crypto.randomUUID() : null;

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("classes")
    .insert(
      occurrences.map((date) => ({
        title: parsed.data.title,
        trainer_id: parsed.data.trainerId || null,
        scheduled_at: date.toISOString(),
        duration_minutes: parsed.data.durationMinutes,
        is_premium: parsed.data.isPremium === "on",
        audience: parsed.data.audience,
        series_id: seriesId,
        // Unique per class. LiveKit creates the room implicitly on first join,
        // so there is nothing to provision on their side — the name just has
        // to not collide, and the unique constraint enforces that. Every
        // session in a series gets its own: sharing one would put next week's
        // class in the same room as this week's.
        livekit_room: `class-${crypto.randomUUID()}`,
      })),
    )
    .select("id");

  if (error || !created || created.length === 0) {
    console.error("[admin] could not create class", error);
    return { error: "Couldn't create the class." };
  }

  if (parsed.data.audience === "groups") {
    const { error: targetError } = await supabase.from("class_groups").insert(
      created.flatMap((row) =>
        parsed.data.groupIds.map((groupId) => ({
          class_id: row.id,
          group_id: groupId,
        })),
      ),
    );

    if (targetError) {
      // Delete rather than leave classes marked "groups" with no audience:
      // they would sit on the schedule looking booked and reach nobody.
      await supabase
        .from("classes")
        .delete()
        .in("id", created.map((row) => row.id));
      console.error("[admin] could not target class", targetError);
      return { error: "Couldn't set the groups for that class." };
    }
  }

  revalidatePath("/admin/classes");
  revalidatePath("/dashboard");
  return {
    success:
      created.length === 1
        ? "Class scheduled."
        : `${created.length} sessions scheduled.`,
  };
}

const classStatusSchema = z.object({
  classId: z.string().uuid(),
  status: z.enum(["scheduled", "live", "ended", "cancelled"]),
});

const updateClassSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().min(2, "Give the class a title.").max(120),
  trainerId: z.string().uuid().optional().or(z.literal("")),
  scheduledAt: z.string().min(1, "Pick a date and time."),
  durationMinutes: z.coerce.number().int().min(5).max(240),
});

/**
 * Editing one class.
 *
 * Admins could create a class and cancel it, but not correct it — a typo in a
 * title, or a time entered an hour out, meant cancelling the session and
 * making a new one, which loses the room and confuses anyone who already had
 * it on their dashboard.
 *
 * Audience is deliberately not editable here, for the same reason it is not
 * on the coach's form: a schema that inherits the "all" default would quietly
 * publish a private session to the whole membership on a title fix.
 *
 * Editing one session of a series edits that session only. There is no shared
 * state to keep in step, and "move every Wednesday" is a different, rarer
 * request than "this one week we start at eight".
 */
export async function updateClass(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = updateClassSchema.safeParse({
    classId: formData.get("classId"),
    title: formData.get("title"),
    trainerId: formData.get("trainerId") ?? "",
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const scheduledAt = parseIstLocal(parsed.data.scheduledAt);
  if (!scheduledAt) {
    return { error: "That date didn't parse." };
  }

  const supabase = await createClient();

  // Read the old time first: whether reminders have to be reissued depends on
  // whether this edit actually moved the class.
  const { data: before } = await supabase
    .from("classes")
    .select("scheduled_at")
    .eq("id", parsed.data.classId)
    .maybeSingle();

  const { error } = await supabase
    .from("classes")
    .update({
      title: parsed.data.title,
      trainer_id: parsed.data.trainerId || null,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: parsed.data.durationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.classId);

  if (error) {
    console.error("[admin] could not update class", error);
    return { error: "Couldn't save those changes." };
  }

  const moved =
    !!before &&
    new Date(before.scheduled_at).getTime() !== scheduledAt.getTime();

  if (moved) {
    // Same reasoning as the coach's edit: `class_reminders` is a claim, so
    // leaving it in place means everyone already told about the old time
    // hears nothing about the new one.
    const admin = createAdminClient();
    const { error: clearError } = await admin
      .from("class_reminders")
      .delete()
      .eq("class_id", parsed.data.classId)
      .eq("kind", "starting_soon");

    if (clearError) console.error("[admin] could not clear reminders", clearError);
  }

  revalidatePath("/admin/classes");
  revalidatePath("/dashboard");
  return {
    success: moved
      ? "Saved. Members will be reminded again at the new time."
      : "Saved.",
  };
}

const cancelSeriesSchema = z.object({ seriesId: z.string().uuid() });

/**
 * Cancels the remaining sessions of a repeating routine.
 *
 * Only the ones that have not happened. A class that already ran is a record
 * of something that took place, and rewriting it to "cancelled" would tell
 * everyone who attended that they did not.
 */
export async function cancelSeries(formData: FormData) {
  await requireAdmin();

  const parsed = cancelSeriesSchema.safeParse({
    seriesId: formData.get("seriesId"),
  });
  if (!parsed.success) {
    redirect("/admin/classes");
  }

  const supabase = await createClient();
  await supabase
    .from("classes")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("series_id", parsed.data.seriesId)
    .in("status", ["scheduled", "live"])
    .gt("scheduled_at", new Date().toISOString());

  revalidatePath("/admin/classes");
  revalidatePath("/dashboard");
  redirect("/admin/classes?cancelled=series");
}

export async function setClassStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = classStatusSchema.safeParse({
    classId: formData.get("classId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.classId);

  if (error) {
    return { error: "Couldn't update the class." };
  }

  revalidatePath("/admin/classes");
  revalidatePath("/dashboard");
  return { success: `Class marked ${parsed.data.status}.` };
}
