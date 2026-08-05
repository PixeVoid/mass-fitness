"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireCoach } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * A trainer managing their own timetable.
 *
 * Two layers, and both are load-bearing:
 *
 *  1. `requireCoach()` establishes that the caller is staff at all. A Server
 *     Action is a public endpoint — anyone who can read the page bundle can
 *     find its id and POST to it — so "only the coach page renders this form"
 *     is not a check.
 *  2. The *ownership* rule is never asserted from here. `trainer_id` is set to
 *     the caller and every update is filtered by it, and underneath that the
 *     `classes: coach ...` policies re-derive the same thing in Postgres. If
 *     this file had a bug, the database would still refuse.
 *
 * That is also why these use the user's own Supabase client and not the
 * service role: the service role bypasses RLS, which would throw away the
 * second layer for no benefit.
 */

export interface CoachState {
  error?: string;
  success?: string;
}

const classSchema = z.object({
  // "all" is every member; otherwise the class reaches only the groups picked.
  // Stored explicitly rather than inferred from whether any group was chosen,
  // because a one-to-one session that silently defaulted to "everyone" would
  // publish a private appointment to the whole membership.
  audience: z.enum(["all", "groups"]).default("all"),
  groupIds: z.array(z.string().uuid()).default([]),
  title: z
    .string()
    .trim()
    .min(3, "Give the class a name members will recognise.")
    .max(120),
  scheduledAt: z.string().min(1, "Pick a date and time."),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(5, "That's too short to be a class.")
    .max(240, "That's longer than four hours."),
});

export async function scheduleOwnClass(
  _prev: CoachState,
  formData: FormData,
): Promise<CoachState> {
  const coach = await requireCoach();

  const parsed = classSchema.safeParse({
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
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

  // A class in the past cannot be taught and cannot be joined — it would sit
  // on the schedule as clutter and generate a reminder nobody can act on.
  if (scheduledAt.getTime() < Date.now() - 60_000) {
    return { error: "That time has already passed." };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase.from("classes").insert({
    title: parsed.data.title,
    // Always the caller. A trainer has no way to schedule into someone else's
    // calendar, and the insert policy would reject it if this line were wrong.
    trainer_id: coach.id,
    trainer_name: coach.name,
    scheduled_at: scheduledAt.toISOString(),
    duration_minutes: parsed.data.durationMinutes,
    // Members-only. Whether a session is given away free is a pricing
    // decision, so it stays with admins in /admin/classes.
    is_premium: true,
    audience: parsed.data.audience,
    // Unique per class. The video room is created implicitly on first join —
    // there is nothing to provision ahead of time, the name only has to not
    // collide, and the unique constraint enforces that.
    livekit_room: `class-${crypto.randomUUID()}`,
  })
  .select("id")
  .single();

  if (error || !created) {
    console.error("[coach] could not schedule class", error);
    return { error: "Couldn't schedule that class." };
  }

  if (parsed.data.audience === "groups") {
    // Only the coach's own groups, re-derived here. A tampered form could
    // otherwise target a colleague's cohort — the RLS policy on class_groups
    // checks the class is theirs, not that the *group* is.
    const { data: mine } = await supabase
      .from("training_groups")
      .select("id")
      .eq("trainer_id", coach.id)
      .in("id", parsed.data.groupIds);

    const rows = (mine ?? []).map((group) => ({
      class_id: created.id,
      group_id: group.id,
    }));

    if (rows.length === 0) {
      // Nothing valid to target. Delete rather than leave a class marked
      // "groups" with no audience — it would reach nobody and look scheduled.
      await supabase.from("classes").delete().eq("id", created.id);
      return { error: "Those groups aren't yours. Pick from your own." };
    }

    const { error: targetError } = await supabase.from("class_groups").insert(rows);
    if (targetError) {
      await supabase.from("classes").delete().eq("id", created.id);
      console.error("[coach] could not target class", targetError);
      return { error: "Couldn't set the groups for that class." };
    }
  }

  revalidatePath("/coach");
  revalidatePath("/dashboard");
  return { success: "Class scheduled." };
}

/**
 * Editing deliberately cannot change the audience.
 *
 * If it inherited classSchema whole, `audience` would fall back to its "all"
 * default on every save — so fixing a typo in the title of a one-to-one
 * session would quietly publish it to the entire membership. Retargeting is a
 * separate action if it is ever wanted.
 */
const updateSchema = classSchema
  .omit({ audience: true, groupIds: true })
  .extend({ classId: z.string().uuid() });

export async function updateOwnClass(
  _prev: CoachState,
  formData: FormData,
): Promise<CoachState> {
  const coach = await requireCoach();

  const parsed = updateSchema.safeParse({
    classId: formData.get("classId"),
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: "That date didn't parse." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({
      title: parsed.data.title,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: parsed.data.durationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.classId)
    // Belt to the RLS policy's braces. Without it a wrong id would be an
    // update the database refuses; with it, it is an update that matches
    // nothing — same outcome, clearer intent at the call site.
    .eq("trainer_id", coach.id);

  if (error) {
    return { error: "Couldn't save those changes." };
  }

  revalidatePath("/coach");
  revalidatePath("/dashboard");
  return { success: "Saved." };
}

const statusSchema = z.object({
  classId: z.string().uuid(),
  // Deliberately not the full ClassStatus set: a trainer moves a class through
  // its life, they do not un-cancel one or set it back to scheduled.
  status: z.enum(["live", "ended", "cancelled"]),
});

export async function setOwnClassStatus(
  _prev: CoachState,
  formData: FormData,
): Promise<CoachState> {
  const coach = await requireCoach();

  const parsed = statusSchema.safeParse({
    classId: formData.get("classId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.classId)
    .eq("trainer_id", coach.id);

  if (error) {
    return { error: "Couldn't update the class." };
  }

  revalidatePath("/coach");
  revalidatePath("/dashboard");
  return {
    success:
      parsed.data.status === "cancelled"
        ? "Class cancelled. Members will see it marked off."
        : `Class marked ${parsed.data.status}.`,
  };
}
