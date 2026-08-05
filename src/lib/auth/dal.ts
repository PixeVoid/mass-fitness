import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
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

/**
 * Whether this request even carries a session cookie.
 *
 * Every auth read below costs at minimum a JWKS-verified parse and, on a
 * symmetric-key project, a full round trip to the Auth server. An anonymous
 * visitor — which is nearly all landing-page traffic — has no token to check,
 * so asking is pure latency. `@supabase/ssr` stores the session under
 * `sb-<project-ref>-auth-token`, split into `.0`/`.1` chunks when it outgrows
 * one cookie; the `-code-verifier` cookies share the prefix but are half-built
 * PKCE flows, not sessions.
 */
export const hasSessionCookie = cache(async (): Promise<boolean> => {
  const store = await cookies();
  return store
    .getAll()
    .some(
      ({ name }) =>
        name.startsWith("sb-") &&
        name.includes("-auth-token") &&
        !name.includes("-code-verifier"),
    );
});

/** Returns the current user, or null. Never redirects — for optional auth. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  if (!(await hasSessionCookie())) return null;

  const supabase = await createClient();

  // getClaims(), not getUser(): both establish identity from a *verified*
  // token rather than a decoded one, but on a project with asymmetric JWT
  // signing keys getClaims does that verification locally against a cached
  // JWKS, so the common case costs no network at all. On a symmetric-key
  // project it falls back to the same Auth-server call getUser() makes, so
  // this is never slower — and it is never less strict.
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return null;

  const { sub, email, phone } = data.claims;
  return {
    id: sub,
    phone: typeof phone === "string" && phone ? phone : null,
    email: typeof email === "string" && email ? email : null,
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

/** What the site header needs to know about the viewer, and nothing more. */
export interface HeaderIdentity {
  firstName: string;
}

/**
 * Identity for the persistent site header.
 *
 * Cheap by construction: it short-circuits to null on the no-cookie path
 * before touching Supabase, and otherwise reuses the same request-cached
 * profile read the page itself is about to make, so rendering the header on
 * /dashboard costs nothing beyond what /dashboard already paid.
 */
export const getHeaderIdentity = cache(
  async (): Promise<HeaderIdentity | null> => {
    const user = await getUser();
    if (!user) return null;

    const profile = await getProfile();

    // The profile name is what they typed at onboarding, so it wins. Before
    // that lands, the email's local part is a better greeting than a generic
    // placeholder — and better than an empty pill.
    const source = profile?.name?.trim() || user.email?.split("@")[0] || "";
    const firstName = source.split(/\s+/)[0] || "Account";

    return { firstName };
  },
);

export const isAdmin = cache(async (): Promise<boolean> => {
  const profile = await getProfile();
  return profile?.role === "admin";
});

export const isCoach = cache(async (): Promise<boolean> => {
  const profile = await getProfile();
  return profile?.role === "trainer" || profile?.role === "admin";
});

/**
 * Gate for /coach — anyone who runs classes.
 *
 * Admins pass too, so an admin can see what a coach sees without swapping
 * accounts. It is not a substitute for the ownership checks: this only says
 * "you are staff", and every write underneath still scopes itself to the
 * caller's own classes, with the `classes: coach ...` policies in Postgres
 * behind that.
 *
 * `notFound()` rather than a redirect, for the same reason `requireAdmin` uses
 * it — a staff area that announces itself to every member is an invitation.
 */
export const requireCoach = cache(async (): Promise<Profile> => {
  await requireUser();
  const profile = await getProfile();

  if (!profile || (profile.role !== "trainer" && profile.role !== "admin")) {
    notFound();
  }

  return profile;
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
