import "server-only";

import type { FitnessClass, Lead, Profile, Subscription } from "@/lib/db-types";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin reads (BUILD_PLAN Phase 6).
 *
 * These deliberately use the *user's* client, not the service role. The admin's
 * own RLS still applies — `is_admin()` is what widens `profiles` and
 * `subscriptions` to every row. So a bug that let a non-admin reach this code
 * returns an empty list rather than the whole member table. The service role is
 * reserved for writes that RLS has no policy for.
 */

export interface MemberRow {
  profile: Profile;
  subscription: Subscription | null;
}

/**
 * Escapes a search term for PostgREST's `or` filter.
 *
 * The value is interpolated into a comma-separated filter expression, so a
 * comma, a parenthesis or a quote in the term does not just break the query —
 * it changes which filters are applied. Percent and underscore are `like`
 * wildcards and a searcher typing them means the literal character.
 */
export function escapeSearchTerm(term: string): string {
  return term.replace(/[%_\\]/g, "\\$&").replace(/[(),."']/g, " ");
}

/**
 * Members plus their current subscription.
 *
 * Two queries and a join in memory rather than a nested select: at this scale
 * it is not worth the round-trip savings, and the shape stays obvious. Revisit
 * if the member list ever outgrows a single page.
 */
export async function listMembers(
  limit = 100,
  /** Matches name or email, case-insensitively. Blank means everyone. */
  search?: string,
): Promise<MemberRow[]> {
  const supabase = await createClient();

  let profileQuery = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  const term = search?.trim();
  if (term) {
    const safe = escapeSearchTerm(term);
    profileQuery = profileQuery.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    profileQuery,
    supabase
      .from("subscriptions")
      .select("*")
      // nullsFirst matters: Postgres sorts NULLs first on DESC, and a pending
      // checkout has no end_date — so an abandoned payment was outranking the
      // membership someone is actually on.
      .order("end_date", { ascending: false, nullsFirst: false }),
  ]);

  // Latest-ending subscription wins, so a renewal shadows the row it replaced.
  const byUser = new Map<string, Subscription>();
  for (const subscription of subscriptions ?? []) {
    if (!byUser.has(subscription.user_id)) {
      byUser.set(subscription.user_id, subscription);
    }
  }

  return (profiles ?? []).map((profile) => ({
    profile,
    subscription: byUser.get(profile.id) ?? null,
  }));
}

export async function listAllClasses(limit = 100): Promise<FitnessClass[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("*")
    .order("scheduled_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

/** Everyone who could be assigned to teach a class. */
export async function listTrainers(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["trainer", "admin"])
    .order("name", { ascending: true });

  return data ?? [];
}

export interface AdminStats {
  members: number;
  activeMembers: number;
  upcomingClasses: number;
  newLeads: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // `head: true` with an exact count fetches no rows — just the number.
  const [members, activeMembers, upcomingClasses, newLeads] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gt("end_date", now),
    supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .in("status", ["scheduled", "live"])
      .gte("scheduled_at", now),
    supabase.from("leads").select("*", { count: "exact", head: true }),
  ]);

  return {
    members: members.count ?? 0,
    activeMembers: activeMembers.count ?? 0,
    upcomingClasses: upcomingClasses.count ?? 0,
    newLeads: newLeads.count ?? 0,
  };
}

/** Leads captured from the anonymous AI assessment flow, newest first. */
export async function listLeads(limit = 100): Promise<Lead[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export interface TargetableGroup {
  id: string;
  name: string;
  kind: "group" | "one_to_one";
  trainerName: string | null;
}

/** Active groups an admin can point a class at, with their coach's name. */
export async function listTargetableGroups(): Promise<TargetableGroup[]> {
  const supabase = await createClient();

  const [{ data: groups }, { data: trainers }] = await Promise.all([
    supabase
      .from("training_groups")
      .select("id, name, kind, trainer_id")
      .eq("active", true)
      .order("kind", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("profiles").select("id, name").in("role", ["trainer", "admin"]),
  ]);

  const names = new Map((trainers ?? []).map((t) => [t.id, t.name]));

  return (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    kind: group.kind,
    trainerName: group.trainer_id ? (names.get(group.trainer_id) ?? null) : null,
  }));
}
