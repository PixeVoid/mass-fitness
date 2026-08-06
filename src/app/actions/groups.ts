"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import {
  getActiveSubscription,
  requireOnboardedProfile,
} from "@/lib/auth/dal";
import { sendEmail } from "@/lib/email/resend";
import { buildNewMemberEmail } from "@/lib/groups/newMemberEmail";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Joining a training group.
 *
 * Service role throughout, because the rules that decide whether a join is
 * allowed cannot be expressed as an RLS policy: they depend on the member
 * having an active subscription *of the matching tier*. `group_members` has
 * no self-insert policy at all, so this action is the only way in.
 *
 * Capacity is not checked here. A count-then-insert loses the race when two
 * people take the last slot at once, so the database enforces it in a trigger
 * (0009) and this catches the rejection.
 */

export interface GroupState {
  error?: string;
}

const joinSchema = z.object({ groupId: z.string().uuid() });

export async function joinGroup(
  _prev: GroupState,
  formData: FormData,
): Promise<GroupState> {
  const profile = await requireOnboardedProfile();
  const subscription = await getActiveSubscription();

  if (!subscription) {
    redirect("/subscribe");
  }

  const parsed = joinSchema.safeParse({ groupId: formData.get("groupId") });
  if (!parsed.success) return { error: "Pick a group." };

  const supabase = createAdminClient();

  // One group per member through this path. The picker already redirects
  // someone who has one, but the action is a public endpoint — without this a
  // crafted request could put one person in every cohort, taking a place in
  // each and defeating the point of a cap. Admins can still place a member in
  // more than one from /admin/groups.
  const { count: existing } = await supabase
    .from("group_members")
    .select("group_id", { count: "exact", head: true })
    .eq("user_id", profile.id);

  if ((existing ?? 0) > 0) {
    return { error: "You're already in a group. Message us to switch." };
  }

  const { data: group } = await supabase
    .from("training_groups")
    .select("*")
    .eq("id", parsed.data.groupId)
    .eq("active", true)
    .maybeSingle();

  if (!group) return { error: "That group isn't available any more." };

  // The tier check. A Group membership does not open a one-to-one cohort, and
  // — per the pricing decision — a one-to-one membership does not open the
  // shared groups either. Each tier buys exactly its own kind of session.
  const expected = subscription.plan_tier === "one_to_one" ? "one_to_one" : "group";
  if (group.kind !== expected) {
    return { error: "That group isn't part of your plan." };
  }

  const { error } = await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: profile.id,
  });

  if (error) {
    // Raised by enforce_group_capacity(). Someone took the last place between
    // the page rendering and the form posting.
    if (error.message.includes("group_full")) {
      return { error: "That group just filled up. Pick another." };
    }
    if (error.code === "23505") {
      // Already in it — treat as success rather than an error the member can
      // do nothing about.
      redirect("/dashboard?notice=group-joined");
    }
    console.error("[groups] join failed", error);
    return { error: "Couldn't join that group. Try again." };
  }

  await notifyCoach(group.trainer_id, group.name, profile.id);

  revalidatePath("/dashboard");
  revalidatePath("/coach");
  redirect("/dashboard?notice=group-joined");
}

const pickCoachSchema = z.object({ coachId: z.string().uuid() });

/**
 * One-to-one: there is no group to join yet, so picking a coach creates one.
 *
 * A cohort of exactly one, named after the member. Everything downstream —
 * scheduling, targeting, reminders, the join check — then treats a private
 * session as an ordinary class aimed at an unusually small group.
 */
export async function pickCoach(
  _prev: GroupState,
  formData: FormData,
): Promise<GroupState> {
  const profile = await requireOnboardedProfile();
  const subscription = await getActiveSubscription();

  if (!subscription) redirect("/subscribe");
  if (subscription.plan_tier !== "one_to_one") {
    return { error: "Your plan is a group plan — pick a group instead." };
  }

  const parsed = pickCoachSchema.safeParse({ coachId: formData.get("coachId") });
  if (!parsed.success) return { error: "Pick a coach." };

  const supabase = createAdminClient();

  const { data: coach } = await supabase
    .from("profiles")
    .select("id, name, one_to_one_capacity, role")
    .eq("id", parsed.data.coachId)
    .maybeSingle();

  if (!coach || (coach.role !== "trainer" && coach.role !== "admin")) {
    return { error: "That coach isn't available." };
  }

  // Re-checked here rather than trusted from the page that rendered the list:
  // between it loading and this posting, someone else may have taken the last
  // slot with this coach.
  const taken = await countPayingPrivateClients(coach.id);
  if (taken >= coach.one_to_one_capacity) {
    return { error: "That coach is fully booked. Pick another." };
  }

  const groupName = `${profile.name ?? "Member"} — one-to-one`;

  const { data: group, error: groupError } = await supabase
    .from("training_groups")
    .insert({
      name: groupName,
      focus: profile.fitness_goal || "One-to-one",
      trainer_id: coach.id,
      kind: "one_to_one",
      capacity: 1,
      schedule_hint: "Times agreed with your coach",
    })
    .select("id")
    .single();

  if (groupError || !group) {
    console.error("[groups] could not create private group", groupError);
    return { error: "Couldn't set that up. Try again." };
  }

  const { error: joinError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: profile.id });

  if (joinError) {
    // Roll the group back rather than leaving an empty private cohort behind
    // that counts against the coach's capacity forever.
    await supabase.from("training_groups").delete().eq("id", group.id);
    console.error("[groups] could not join private group", joinError);
    return { error: "Couldn't set that up. Try again." };
  }

  // The capacity check above is a read followed by a write, which two people
  // taking a coach's last slot at the same moment both pass. Group capacity is
  // enforced by a trigger for exactly this reason, but a *coach's* limit spans
  // rows the trigger never sees — so it is settled after the fact instead.
  //
  // Both writers now rank the same committed list, so whoever created the
  // later group is the one that stands down. A group cohort would need a lock;
  // here the loser can simply be undone, because nothing else has touched it
  // yet and the member has not been told anything.
  if (!(await withinCapacity(coach.id, group.id, coach.one_to_one_capacity))) {
    await supabase.from("group_members").delete().eq("group_id", group.id);
    await supabase.from("training_groups").delete().eq("id", group.id);
    return { error: "That coach was booked out a moment ago. Pick another." };
  }

  await notifyCoach(coach.id, groupName, profile.id);

  revalidatePath("/dashboard");
  revalidatePath("/coach");
  redirect("/dashboard?notice=coach-assigned");
}

/**
 * How many private clients a coach currently has who are still paying.
 *
 * Counting every active one-to-one group would count people who lapsed months
 * ago: nothing deactivates a private group when its member stops paying, so a
 * coach set to four would silently fill with clients who left and become
 * unbookable forever. Membership is the thing that makes a slot occupied.
 */
async function countPayingPrivateClients(coachId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data: groups } = await supabase
    .from("training_groups")
    .select("id")
    .eq("trainer_id", coachId)
    .eq("kind", "one_to_one")
    .eq("active", true);

  if (!groups || groups.length === 0) return 0;

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .in(
      "group_id",
      groups.map((group) => group.id),
    );

  const userIds = [...new Set((members ?? []).map((row) => row.user_id))];
  if (userIds.length === 0) return 0;

  const { data: live } = await supabase
    .from("subscriptions")
    .select("user_id")
    .in("user_id", userIds)
    .eq("status", "active")
    .gt("end_date", new Date().toISOString());

  return new Set((live ?? []).map((row) => row.user_id)).size;
}

/**
 * Whether a freshly created private group is inside its coach's limit.
 *
 * Ranks the coach's occupied one-to-one groups oldest first and asks whether
 * this one falls within the first `capacity`. Ordering by creation time is
 * what makes the answer the same for every caller: two racing writers both see
 * both rows, and both agree which of them is the extra one.
 *
 * A group with no paying member does not occupy a slot, on the same reasoning
 * as `countPayingPrivateClients` — otherwise a coach fills permanently with
 * clients who lapsed.
 */
async function withinCapacity(
  coachId: string,
  groupId: string,
  capacity: number,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: groups } = await supabase
    .from("training_groups")
    .select("id, created_at")
    .eq("trainer_id", coachId)
    .eq("kind", "one_to_one")
    .eq("active", true)
    .order("created_at", { ascending: true })
    // Ties are possible — `now()` is the transaction start time, so two joins
    // in the same instant can share a timestamp. The id breaks it, arbitrarily
    // but identically for both callers, which is all this needs.
    .order("id", { ascending: true });

  if (!groups || groups.length === 0) return true;

  const { data: members } = await supabase
    .from("group_members")
    .select("group_id, user_id")
    .in(
      "group_id",
      groups.map((group) => group.id),
    );

  const userIds = [...new Set((members ?? []).map((row) => row.user_id))];
  const { data: live } = userIds.length
    ? await supabase
        .from("subscriptions")
        .select("user_id")
        .in("user_id", userIds)
        .eq("status", "active")
        .gt("end_date", new Date().toISOString())
    : { data: [] };

  const paying = new Set((live ?? []).map((row) => row.user_id));
  const occupiedGroups = new Set(
    (members ?? [])
      .filter((row) => paying.has(row.user_id))
      .map((row) => row.group_id),
  );

  const rank = groups
    .filter((group) => occupiedGroups.has(group.id))
    .findIndex((group) => group.id === groupId);

  // Not in the occupied list at all means this member is not counted as paying
  // — which cannot happen on this path, and if it somehow does, refusing them
  // a coach they have paid for is the worse failure.
  return rank === -1 || rank < capacity;
}

/**
 * Tells a coach someone new has joined.
 *
 * Best effort on purpose: a failed email must not undo a join the member has
 * already been told succeeded. The coach still sees them in /coach either way,
 * which is the durable half of the notification — the email is the nudge.
 */
async function notifyCoach(
  coachId: string | null,
  groupName: string,
  memberId: string,
) {
  if (!coachId) return;

  try {
    const supabase = createAdminClient();

    const [{ data: coach }, { data: member }] = await Promise.all([
      supabase.from("profiles").select("name, email").eq("id", coachId).maybeSingle(),
      supabase
        .from("profiles")
        .select("name, email, fitness_goal")
        .eq("id", memberId)
        .maybeSingle(),
    ]);

    if (!coach?.email || !member) return;

    // The assessment they took before signing up, matched on email. Coaches
    // see it in full — stated at the quiz and in the privacy policy, which is
    // why it can be sent here.
    const assessment = member.email
      ? (
          await supabase
            .from("leads")
            .select("score, band, tier_nudge, summary")
            .eq("email", member.email.toLowerCase())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data
      : null;

    const { subject, html } = buildNewMemberEmail({
      coachName: coach.name?.split(/\s+/)[0] ?? "there",
      memberName: member.name ?? "A new member",
      groupName,
      fitnessGoal: member.fitness_goal,
      assessment: assessment
        ? {
            score: assessment.score,
            band: assessment.band,
            summary: assessment.summary,
          }
        : null,
      coachUrl: `${publicEnv.siteUrl}/coach`,
    });

    await sendEmail({ to: coach.email, subject, html });
  } catch (error) {
    console.error("[groups] coach notification failed", error);
  }
}
