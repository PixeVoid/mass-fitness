import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectTarget } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Google OAuth lands here with a `code` query param (PKCE flow). Exchanging
 * it for a session is the one step `signInWithOAuth` in actions/auth.ts
 * cannot do itself — that action only starts the handshake by redirecting to
 * Google's consent screen.
 *
 * A Route Handler rather than a Server Action because this is a plain
 * cross-site redirect from Google, not a form post from our own page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectTarget(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Google sign-in didn't complete. Try again.")}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message ?? "Google sign-in didn't complete. Try again.")}`,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", data.user.id)
    .maybeSingle();

  const target = profile?.onboarded_at
    ? next
    : `/onboarding?next=${encodeURIComponent(next)}`;

  return NextResponse.redirect(`${origin}${target}`);
}
