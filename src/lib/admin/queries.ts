import "server-only";

import type { FitnessClass, Profile, Subscription } from "@/lib/db-types";
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
 * Members plus their current subscription.
 *
 * Two queries and a join in memory rather than a nested select: at this scale
 * it is not worth the round-trip savings, and the shape stays obvious. Revisit
 * if the member list ever outgrows a single page.
 */
export async function listMembers(limit = 100): Promise<MemberRow[]> {
  const supabase = await createClient();

  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("subscriptions")
      .select("*")
      .order("end_date", { ascending: false }),
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
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // `head: true` with an exact count fetches no rows — just the number.
  const [members, activeMembers, upcomingClasses] = await Promise.all([
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
  ]);

  return {
    members: members.count ?? 0,
    activeMembers: activeMembers.count ?? 0,
    upcomingClasses: upcomingClasses.count ?? 0,
  };
}
