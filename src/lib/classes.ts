import "server-only";

import type { FitnessClass } from "@/lib/db-types";
import { createClient } from "@/lib/supabase/server";

/**
 * Class scheduling reads (BUILD_PLAN 3.7). `classes` is publicly readable
 * under RLS, so these work with or without a session.
 */

/**
 * A class stays joinable for its full duration plus a grace window — someone
 * arriving five minutes late should still get in, and a session that overruns
 * shouldn't lock out a returning viewer.
 */
const JOIN_GRACE_MINUTES = 20;

export async function getUpcomingClasses(limit = 8): Promise<FitnessClass[]> {
  const supabase = await createClient();

  // Look slightly into the past so a class that has just started is still
  // listed rather than vanishing at its own start time.
  const from = new Date(Date.now() - JOIN_GRACE_MINUTES * 60_000);

  const { data } = await supabase
    .from("classes")
    .select("*")
    .in("status", ["scheduled", "live"])
    .gte("scheduled_at", from.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function getClassById(id: string): Promise<FitnessClass | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data ?? null;
}

export type ClassWindow = "upcoming" | "open" | "ended";

/**
 * Where a class sits relative to now. Drives UI copy only — the token route
 * makes its own decision, because a client clock is not an access control.
 */
export function classWindow(
  fitnessClass: Pick<
    FitnessClass,
    "scheduled_at" | "duration_minutes" | "status"
  >,
  now: Date = new Date(),
): ClassWindow {
  if (fitnessClass.status === "ended" || fitnessClass.status === "cancelled") {
    return "ended";
  }

  const start = new Date(fitnessClass.scheduled_at).getTime();
  const opensAt = start - JOIN_GRACE_MINUTES * 60_000;
  const closesAt =
    start + (fitnessClass.duration_minutes + JOIN_GRACE_MINUTES) * 60_000;
  const t = now.getTime();

  if (t < opensAt) return "upcoming";
  if (t > closesAt) return "ended";
  return "open";
}

/** "Sat 26 Jul, 7:00 am" in IST — the timezone every member is actually in. */
export function formatClassTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}
