import "server-only";

import { cache } from "react";
import type { FitnessClass, Profile, TrainingGroup } from "@/lib/db-types";
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
 * The classes a member should actually see.
 *
 * Filtering happens here rather than in RLS because `classes: public read` has
 * to stay open — the marketing site lists the schedule to logged-out visitors.
 * The gate that matters is in the token route; this is what stops a dashboard
 * advertising sessions someone cannot attend, which reads as a paywall inside
 * the thing they already paid for.
 */
export async function filterClassesForMember(
  classes: FitnessClass[],
  groupIds: string[],
): Promise<FitnessClass[]> {
  const targeted = classes.filter((item) => item.audience === "groups");
  if (targeted.length === 0) return classes;

  const supabase = await createClient();
  const { data } = await supabase
    .from("class_groups")
    .select("class_id, group_id")
    .in(
      "class_id",
      targeted.map((item) => item.id),
    );

  const allowed = new Set(
    (data ?? [])
      .filter((row) => groupIds.includes(row.group_id))
      .map((row) => row.class_id),
  );

  return classes.filter(
    (item) => item.audience === "all" || allowed.has(item.id),
  );
}

/**
 * Whether this member may join one specific class.
 *
 * Called by the token route, so it is an access decision and not a display
 * one. Reads with the service role because a member cannot see another
 * group's targeting rows — and the answer must not depend on what they happen
 * to be allowed to read.
 */
export async function memberMayJoinClass(
  fitnessClass: Pick<FitnessClass, "id" | "audience">,
  userId: string,
): Promise<boolean> {
  if (fitnessClass.audience === "all") return true;

  const supabase = createAdminClient();
  const [{ data: targets }, { data: memberships }] = await Promise.all([
    supabase.from("class_groups").select("group_id").eq("class_id", fitnessClass.id),
    supabase.from("group_members").select("group_id").eq("user_id", userId),
  ]);

  // A class marked 'groups' but targeting nothing admits nobody. That is the
  // safe reading of a half-finished class, and the coach UI refuses to create
  // one — but the check should not depend on the UI having held.
  const mine = new Set((memberships ?? []).map((row) => row.group_id));
  return (targets ?? []).some((row) => mine.has(row.group_id));
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

  const { data: privateGroups } = await supabase
    .from("training_groups")
    .select("trainer_id")
    .eq("kind", "one_to_one")
    .eq("active", true);

  const load = new Map<string, number>();
  for (const row of privateGroups ?? []) {
    if (row.trainer_id) {
      load.set(row.trainer_id, (load.get(row.trainer_id) ?? 0) + 1);
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
export async function getAssessmentForMember(email: string | null) {
  if (!email) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("email", email.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
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
