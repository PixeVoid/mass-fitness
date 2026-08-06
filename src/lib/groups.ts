import "server-only";

import { cache } from "react";
import { canAccessClass, decideClassAccess, type JoinDecision } from "@/lib/classAccess";
import type { FitnessClass, PlanTier, Profile, TrainingGroup } from "@/lib/db-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Training groups — cohorts, capacity, and who a class is actually for.
 *
 * The rule everything here serves: a member sees and joins the classes aimed
 * at a group they are in, plus anything aimed at everyone. `audience = 'all'`
 * is what every class written before this feature has, so nothing that existed
 * before groups quietly disappeared from anyone's dashboard.
 */

export interface GroupWithSpace extends TrainingGroup {
  memberCount: number;
  spacesLeft: number;
  trainerName: string | null;
}

/** Groups this member belongs to. Empty is a real state — see `needsGroup`. */
export const getMyGroupIds = cache(async (userId: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  return (data ?? []).map((row) => row.group_id);
});

export const getMyGroups = cache(async (userId: string): Promise<TrainingGroup[]> => {
  const ids = await getMyGroupIds(userId);
  if (ids.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("training_groups")
    .select("*")
    .in("id", ids)
    .order("name", { ascending: true });

  return data ?? [];
});

/**
 * Which of these classes belong to this member, newest first, capped.
 *
 * The cap is applied *after* filtering, which is the whole reason this takes a
 * limit rather than the caller slicing the result. Fetching the soonest eight
 * and then filtering meant a member whose group's next session was ninth in
 * the global schedule saw an empty dashboard — with several groups running,
 * routinely.
 *
 * Filtering happens here rather than in RLS because `classes: public read`
 * has to stay open: the marketing site lists the schedule to logged-out
 * visitors. The gate that matters is in the token route, and both call the
 * same `decideClassAccess`.
 */
export async function filterClassesForMember(
  classes: FitnessClass[],
  access: { groupIds: readonly string[]; planTier: PlanTier | null },
  limit?: number,
): Promise<FitnessClass[]> {
  const targetsByClass = await loadClassTargets(
    classes.filter((item) => item.audience === "groups").map((item) => item.id),
  );

  const visible = classes.filter((item) =>
    canAccessClass({
      audience: item.audience,
      isPremium: item.is_premium,
      isHost: false,
      planTier: access.planTier,
      memberGroupIds: access.groupIds,
      classGroupIds: [...(targetsByClass.get(item.id) ?? [])],
    }),
  );

  return typeof limit === "number" ? visible.slice(0, limit) : visible;
}

/** class_id → the groups it targets. Untargeted classes are simply absent. */
async function loadClassTargets(
  classIds: string[],
): Promise<Map<string, Set<string>>> {
  const byClass = new Map<string, Set<string>>();
  if (classIds.length === 0) return byClass;

  const supabase = await createClient();
  const { data } = await supabase
    .from("class_groups")
    .select("class_id, group_id")
    .in("class_id", classIds);

  for (const row of data ?? []) {
    const set = byClass.get(row.class_id) ?? new Set<string>();
    set.add(row.group_id);
    byClass.set(row.class_id, set);
  }

  return byClass;
}

/**
 * Whether this member may join one specific class, and why not if not.
 *
 * Called by the token route, so it is an access decision and not a display
 * one. Reads the targeting with the service role because a member cannot see
 * another group's rows — and the answer must not depend on what they happen to
 * be allowed to read.
 */
export async function decideJoin(
  fitnessClass: Pick<FitnessClass, "id" | "audience" | "is_premium">,
  userId: string,
  planTier: PlanTier | null,
  isHost: boolean,
): Promise<JoinDecision> {
  if (isHost) return "ok";

  const supabase = createAdminClient();
  const [{ data: targets }, { data: memberships }] = await Promise.all([
    fitnessClass.audience === "groups"
      ? supabase.from("class_groups").select("group_id").eq("class_id", fitnessClass.id)
      : Promise.resolve({ data: [] as { group_id: string }[] }),
    supabase.from("group_members").select("group_id").eq("user_id", userId),
  ]);

  return decideClassAccess({
    audience: fitnessClass.audience,
    isPremium: fitnessClass.is_premium,
    isHost: false,
    planTier,
    memberGroupIds: (memberships ?? []).map((row) => row.group_id),
    classGroupIds: (targets ?? []).map((row) => row.group_id),
  });
}

/** Groups a member could still join, with their remaining space. */
export async function getJoinableGroups(
  kind: "group" | "one_to_one",
): Promise<GroupWithSpace[]> {
  const supabase = createAdminClient();

  const { data: groups } = await supabase
    .from("training_groups")
    .select("*")
    .eq("kind", kind)
    .eq("active", true)
    .order("name", { ascending: true });

  if (!groups || groups.length === 0) return [];

  const [{ data: members }, { data: trainers }] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id")
      .in(
        "group_id",
        groups.map((group) => group.id),
      ),
    supabase.from("profiles").select("id, name").in("role", ["trainer", "admin"]),
  ]);

  const counts = new Map<string, number>();
  for (const row of members ?? []) {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }

  const trainerNames = new Map(
    (trainers ?? []).map((trainer) => [trainer.id, trainer.name]),
  );

  return groups
    .map((group) => {
      const memberCount = counts.get(group.id) ?? 0;
      return {
        ...group,
        memberCount,
        spacesLeft: Math.max(0, group.capacity - memberCount),
        trainerName: group.trainer_id
          ? (trainerNames.get(group.trainer_id) ?? null)
          : null,
      };
    })
    .filter((group) => group.spacesLeft > 0);
}

export interface AvailableCoach {
  id: string;
  name: string | null;
  clients: number;
  capacity: number;
}

/**
 * Coaches with room for another one-to-one client.
 *
 * Capacity is opt-in — `one_to_one_capacity` defaults to zero — so a new
 * trainer does not silently become bookable for private clients the moment
 * their role is set.
 */
export async function getAvailableCoaches(): Promise<AvailableCoach[]> {
  const supabase = createAdminClient();

  const { data: coaches } = await supabase
    .from("profiles")
    .select("id, name, one_to_one_capacity")
    .in("role", ["trainer", "admin"])
    .gt("one_to_one_capacity", 0);

  if (!coaches || coaches.length === 0) return [];

  // Only clients who are still paying occupy a slot. Nothing deactivates a
  // private group when its member lapses, so counting every active one would
  // fill a coach permanently with people who left.
  const { data: privateGroups } = await supabase
    .from("training_groups")
    .select("id, trainer_id")
    .eq("kind", "one_to_one")
    .eq("active", true);

  const load = new Map<string, number>();

  if (privateGroups && privateGroups.length > 0) {
    const [{ data: members }, { data: live }] = await Promise.all([
      supabase
        .from("group_members")
        .select("group_id, user_id")
        .in(
          "group_id",
          privateGroups.map((group) => group.id),
        ),
      supabase
        .from("subscriptions")
        .select("user_id")
        .eq("status", "active")
        .gt("end_date", new Date().toISOString()),
    ]);

    const paying = new Set((live ?? []).map((row) => row.user_id));
    const trainerByGroup = new Map(
      privateGroups.map((group) => [group.id, group.trainer_id]),
    );

    for (const row of members ?? []) {
      if (!paying.has(row.user_id)) continue;
      const trainerId = trainerByGroup.get(row.group_id);
      if (trainerId) load.set(trainerId, (load.get(trainerId) ?? 0) + 1);
    }
  }

  return coaches
    .map((coach) => ({
      id: coach.id,
      name: coach.name,
      clients: load.get(coach.id) ?? 0,
      capacity: coach.one_to_one_capacity,
    }))
    .filter((coach) => coach.clients < coach.capacity);
}

/** Members who joined one of this coach's groups recently. */
export interface NewMember {
  userId: string;
  name: string | null;
  email: string | null;
  fitnessGoal: string | null;
  groupName: string;
  joinedAt: string;
}

const NEW_MEMBER_DAYS = 14;

export async function getRecentJoins(coachId: string): Promise<NewMember[]> {
  const supabase = createAdminClient();

  const { data: groups } = await supabase
    .from("training_groups")
    .select("id, name")
    .eq("trainer_id", coachId);

  if (!groups || groups.length === 0) return [];
  const names = new Map(groups.map((group) => [group.id, group.name]));

  const since = new Date(
    Date.now() - NEW_MEMBER_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: joins } = await supabase
    .from("group_members")
    .select("group_id, user_id, joined_at")
    .in("group_id", [...names.keys()])
    .gte("joined_at", since)
    .order("joined_at", { ascending: false });

  if (!joins || joins.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, email, fitness_goal")
    .in(
      "id",
      joins.map((join) => join.user_id),
    );

  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return joins.map((join) => {
    const profile = byId.get(join.user_id);
    return {
      userId: join.user_id,
      name: profile?.name ?? null,
      email: profile?.email ?? null,
      fitnessGoal: profile?.fitness_goal ?? null,
      groupName: names.get(join.group_id) ?? "—",
      joinedAt: join.joined_at,
    };
  });
}

/**
 * The self-assessment a member took before signing up, matched on email.
 *
 * Coaches see the whole thing, answers included — that is a deliberate choice
 * and it is why the assessment form and the privacy policy both say so before
 * anyone fills it in. Consent for this is given at the quiz, not assumed here.
 */
export async function getAssessmentsForMembers(
  emails: (string | null)[],
): Promise<Map<string, { score: number | null; band: string | null; summary: string | null }>> {
  const wanted = [...new Set(emails.filter((e): e is string => Boolean(e)))].map(
    (email) => email.toLowerCase(),
  );

  const found = new Map<
    string,
    { score: number | null; band: string | null; summary: string | null }
  >();
  if (wanted.length === 0) return found;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("leads")
    .select("email, score, band, summary, created_at")
    .in("email", wanted)
    .order("created_at", { ascending: false });

  // Newest first, so the first row per address wins — someone who retook the
  // quiz should be read on their latest answers.
  for (const row of data ?? []) {
    if (!row.email || found.has(row.email)) continue;
    found.set(row.email, {
      score: row.score,
      band: row.band,
      summary: row.summary,
    });
  }

  return found;
}

/** A paying member with no group has nothing on their dashboard — chase them. */
export function needsGroup(
  profile: Pick<Profile, "role">,
  hasSubscription: boolean,
  groupCount: number,
): boolean {
  if (profile.role === "trainer" || profile.role === "admin") return false;
  return hasSubscription && groupCount === 0;
}
