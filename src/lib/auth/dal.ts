import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Profile, Subscription } from "@/lib/db-types";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer.
 *
 * Every server-side read of "who is this and what may they do" goes through
 * here. Centralising it means an auth check cannot be forgotten at a call
 * site, and `cache()` collapses the repeated calls a single render makes into
 * one round trip.
 *
 * `cache()` is per-request, so there is no cross-user leakage between
 * concurrent requests.
 */

export interface SessionUser {
  id: string;
  phone: string | null;
  email: string | null;
}

/** Returns the current user, or null. Never redirects — for optional auth. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    phone: user.phone ?? null,
    email: user.email ?? null,
  };
});

/**
 * Returns the current user or redirects to /login. Use in pages and Server
 * Actions that have no meaning without a session.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
});

/**
 * Profile guaranteed to exist and to have completed onboarding.
 *
 * The signup trigger creates the row, so a missing profile means a genuinely
 * broken state rather than a new user — new users have a row with a null
 * `onboarded_at`, and get sent to /onboarding instead.
 */
export const requireOnboardedProfile = cache(async (): Promise<Profile> => {
  await requireUser();
  const profile = await getProfile();

  if (!profile) redirect("/login");
  if (!profile.onboarded_at) redirect("/onboarding");

  return profile;
});

export const isAdmin = cache(async (): Promise<boolean> => {
  const profile = await getProfile();
  return profile?.role === "admin";
});

/**
 * Gate for everything under /admin.
 *
 * Non-admins get `notFound()` rather than a redirect or a 403 page: an admin
 * area that announces its own existence to every logged-in member is an
 * invitation to go looking. As far as a member is concerned the route does not
 * exist.
 *
 * Must be called by every admin page *and* every admin Server Action — an
 * action is a public endpoint, and the fact that only an admin page renders
 * the button that calls it protects nothing.
 */
export const requireAdmin = cache(async (): Promise<Profile> => {
  await requireUser();
  const profile = await getProfile();

  if (!profile || profile.role !== "admin") notFound();

  return profile;
});

/**
 * The paywall check (BUILD_PLAN 3.5).
 *
 * Both halves matter: a row can sit at status 'active' with an `end_date` in
 * the past if the expiry sweep has not run yet, so status alone is not
 * sufficient. A null `end_date` is treated as not-yet-valid rather than
 * never-expiring — a subscription with no term is a half-written payment
 * record, not a lifetime membership.
 */
export const getActiveSubscription = cache(
  async (): Promise<Subscription | null> => {
    const user = await getUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("end_date", new Date().toISOString())
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ?? null;
  },
);

export const hasActiveSubscription = cache(async (): Promise<boolean> => {
  return (await getActiveSubscription()) !== null;
});
