import "server-only";

import type { NextClass } from "@/components/classes/NextClassBanner";
import type { FitnessClass, Profile } from "@/lib/db-types";
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

type ClassTiming = Pick<
  FitnessClass,
  "scheduled_at" | "duration_minutes" | "status"
>;

/**
 * The exact moments the door opens and closes, as epoch milliseconds.
 *
 * Exported because the dashboard's countdown needs the same two numbers the
 * window check uses. Sending the *timestamps* to the browser rather than a
 * pre-computed "upcoming" keeps one definition of when a class is joinable —
 * a second copy of the grace-period arithmetic in a client component is
 * exactly the kind of thing that drifts a release later and starts telling
 * people a class is closed while it is running.
 */
export function classJoinWindow(fitnessClass: ClassTiming): {
  startsAtMs: number;
  opensAtMs: number;
  closesAtMs: number;
} {
  const startsAtMs = new Date(fitnessClass.scheduled_at).getTime();

  return {
    startsAtMs,
    opensAtMs: startsAtMs - JOIN_GRACE_MINUTES * 60_000,
    closesAtMs:
      startsAtMs + (fitnessClass.duration_minutes + JOIN_GRACE_MINUTES) * 60_000,
  };
}

/**
 * Where a class sits relative to now. Drives UI copy only — the token route
 * makes its own decision, because a client clock is not an access control.
 */
export function classWindow(
  fitnessClass: ClassTiming,
  now: Date = new Date(),
): ClassWindow {
  if (fitnessClass.status === "ended" || fitnessClass.status === "cancelled") {
    return "ended";
  }

  const { opensAtMs, closesAtMs } = classJoinWindow(fitnessClass);
  const t = now.getTime();

  if (t < opensAtMs) return "upcoming";
  if (t > closesAtMs) return "ended";
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

/**
 * The soonest class still worth showing a countdown for, shaped for the
 * dashboard banner.
 *
 * Lives here rather than in the page for two reasons: reading the clock is a
 * side effect and does not belong in a component body, and every rule it
 * applies — the join window, who counts as a host, whether the paywall is
 * satisfied — is already defined in this layer. The browser receives the
 * outcome and two timestamps, never the rules.
 */
export function buildNextClass(
  classes: FitnessClass[],
  profile: Pick<Profile, "id" | "role">,
  hasMembership: boolean,
): { nextClass: NextClass | null; nowMs: number } {
  const nowMs = Date.now();

  // `getUpcomingClasses` is already ordered ascending and already drops ended
  // and cancelled ones, so this is effectively the head of the list — but it
  // is re-filtered on the closing time, because a class whose window shut
  // while a page sat open is not "next" any more.
  const candidate = classes.find(
    (item) => classJoinWindow(item).closesAtMs > nowMs,
  );

  if (!candidate) return { nextClass: null, nowMs };

  const isHost = profile.role === "admin" || candidate.trainer_id === profile.id;

  return {
    nowMs,
    nextClass: {
      id: candidate.id,
      title: candidate.title,
      trainerName: candidate.trainer_name,
      formattedTime: formatClassTime(candidate.scheduled_at),
      durationMinutes: candidate.duration_minutes,
      ...classJoinWindow(candidate),
      canJoin: !candidate.is_premium || hasMembership || isHost,
      isHost,
    },
  };
}
