"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { PLAN_DURATIONS, PLAN_TIERS, termEndDate } from "@/lib/plans";
import { getPlan } from "@/lib/pricing";
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
  // datetime-local submits "2026-07-26T07:00" with no timezone. The browser
  // produced it in the admin's local time, so it is parsed as local time here.
  scheduledAt: z.string().min(1, "Pick a date and time."),
  durationMinutes: z.coerce.number().int().min(5).max(240),
  isPremium: z.union([z.literal("on"), z.literal("")]).optional(),
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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  if (parsed.data.audience === "groups" && parsed.data.groupIds.length === 0) {
    return { error: "Pick at least one group, or open it to everyone." };
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: "That date didn't parse." };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase.from("classes").insert({
    title: parsed.data.title,
    trainer_id: parsed.data.trainerId || null,
    scheduled_at: scheduledAt.toISOString(),
    duration_minutes: parsed.data.durationMinutes,
    is_premium: parsed.data.isPremium === "on",
    audience: parsed.data.audience,
    // Unique per class. LiveKit creates the room implicitly on first join, so
    // there is nothing to provision on their side — the name just has to not
    // collide, and the unique constraint enforces that.
    livekit_room: `class-${crypto.randomUUID()}`,
  })
  .select("id")
  .single();

  if (error || !created) {
    return { error: "Couldn't create the class." };
  }

  if (parsed.data.audience === "groups") {
    const { error: targetError } = await supabase.from("class_groups").insert(
      parsed.data.groupIds.map((groupId) => ({
        class_id: created.id,
        group_id: groupId,
      })),
    );

    if (targetError) {
      // Delete rather than leave a class marked "groups" with no audience: it
      // would sit on the schedule looking booked and reach nobody.
      await supabase.from("classes").delete().eq("id", created.id);
      console.error("[admin] could not target class", targetError);
      return { error: "Couldn't set the groups for that class." };
    }
  }

  revalidatePath("/admin/classes");
  revalidatePath("/dashboard");
  return { success: "Class scheduled." };
}

const classStatusSchema = z.object({
  classId: z.string().uuid(),
  status: z.enum(["scheduled", "live", "ended", "cancelled"]),
});

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
