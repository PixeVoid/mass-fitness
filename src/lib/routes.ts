/**
 * Route classification shared by proxy.ts and the pages themselves.
 *
 * Kept dependency-free so proxy.ts can import it without dragging in
 * `server-only` modules or the Supabase SDK.
 */

/** Requires a signed-in user. Anonymous visitors get bounced to /login. */
const AUTHED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/live",
  "/admin",
  // Checkout needs an account for the membership to attach to, so an
  // anonymous visitor is sent to log in and returned here afterwards rather
  // than getting halfway through paying and then being asked who they are.
  "/subscribe",
];

/** Auth entry points — pointless to show to someone already signed in. */
const AUTH_ENTRY_PREFIXES = ["/login"];

export function isAuthedRoute(pathname: string): boolean {
  return AUTHED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthEntryRoute(pathname: string): boolean {
  return AUTH_ENTRY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Builds a /login URL that returns the user to where they were headed.
 * Only same-origin relative paths are carried through — an absolute URL in
 * `next` would turn the login page into an open redirect.
 */
export function loginUrlFor(pathname: string, search = ""): string {
  const target = `${pathname}${search}`;
  if (!target.startsWith("/") || target.startsWith("//")) {
    return "/login";
  }
  return `/login?next=${encodeURIComponent(target)}`;
}

export function safeRedirectTarget(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}
