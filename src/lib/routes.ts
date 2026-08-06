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
  "/coach",
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
  if (!isSameOriginPath(target)) return "/login";
  return `/login?next=${encodeURIComponent(target)}`;
}

export function safeRedirectTarget(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  return isSameOriginPath(next) ? next : fallback;
}

/**
 * Whether a string is a path on this site and nothing else.
 *
 * "starts with / and not //" is the obvious check and it is not enough.
 * Browsers normalise a backslash to a forward slash in the authority
 * position, so `/\evil.example` is fetched as `//evil.example` — a
 * protocol-relative URL to somebody else's domain. Chrome, Safari and Firefox
 * all do this. Control characters are stripped before parsing too, which
 * turns `/<tab>/evil.example` into the same thing.
 *
 * So: no control characters at all, no backslashes at all, must start with a
 * single slash. Nothing this app legitimately redirects to contains either.
 */
function isSameOriginPath(value: string | null | undefined): value is string {
  if (!value) return false;

  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.includes("\\")) return false;

  return value.startsWith("/") && !value.startsWith("//");
}
