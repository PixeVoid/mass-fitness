import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthEntryRoute, isAuthedRoute, loginUrlFor } from "@/lib/routes";

/**
 * Next 16 renamed Middleware to Proxy. Same execution model: runs before the
 * route renders.
 *
 * Two jobs here:
 *
 *  1. Refresh the Supabase session. Access tokens are short-lived, and Server
 *     Components cannot write cookies, so without this the user is silently
 *     logged out when their token expires mid-session. This has to happen on
 *     every matched request, which is why the matcher below is broad.
 *
 *  2. An *optimistic* auth redirect. It only decides whether to send an
 *     anonymous visitor to /login — it is not the access control. Real gating
 *     happens in the DAL (src/lib/auth/dal.ts), in each route handler, and in
 *     Postgres RLS. Anything that matters is checked next to the data.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured there is no session to refresh and nothing to
  // protect. Failing open here keeps the marketing site building and serving
  // on a checkout with no .env.local — the gated routes still refuse to render
  // because their own server-side checks throw.
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  // No session cookie means there is nothing to refresh and nobody to
  // identify, so the Supabase client — and the auth round trip it would make —
  // is skipped entirely. This is the whole of anonymous landing-page traffic,
  // and it was previously paying for an auth call on every navigation.
  if (!hasSessionCookie(request)) {
    if (!pathname.startsWith("/api/") && isAuthedRoute(pathname)) {
      return NextResponse.redirect(
        new URL(loginUrlFor(pathname, search), request.url),
      );
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Written twice on purpose: onto `request` so anything rendering
        // downstream in this same pass sees the refreshed token, and onto a
        // fresh `response` so the browser actually receives the Set-Cookie.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims(), not getSession(): it verifies the token's signature instead
  // of trusting a cookie the client could have forged, and — unlike getUser()
  // — does that verification locally against a cached JWKS when the project
  // uses asymmetric signing keys. It still refreshes an about-to-expire
  // session, which is job (1) above. On a symmetric-key project it degrades to
  // exactly the Auth-server call getUser() was making.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims ?? null;

  // API routes answer with a status code, never a redirect to an HTML page —
  // a fetch() caller wants 401, not the login markup.
  if (!pathname.startsWith("/api/")) {
    if (!user && isAuthedRoute(pathname)) {
      return NextResponse.redirect(
        new URL(loginUrlFor(pathname, search), request.url),
      );
    }

    if (user && isAuthEntryRoute(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

/**
 * Mirrors `hasSessionCookie` in the DAL, against a NextRequest rather than the
 * `cookies()` store — the two cannot share an implementation because this file
 * must stay clear of `server-only` modules.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      ({ name }) =>
        name.startsWith("sb-") &&
        name.includes("-auth-token") &&
        !name.includes("-code-verifier"),
    );
}

export const config = {
  // Everything except static assets and image files. Auth cookies must refresh
  // on ordinary navigations, so this deliberately does not narrow to the
  // protected routes only.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|mp4|woff2?|ttf)$).*)",
  ],
};
