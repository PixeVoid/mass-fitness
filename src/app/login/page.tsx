import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { safeRedirectTarget } from "@/lib/routes";
import LoginForm from "./LoginForm";

// Behind-auth routes stay out of the index per BUILD_PLAN section 0.2. robots.txt
// disallows it too — this is the belt to that braces, since a disallowed URL can
// still be indexed if something links to it.
export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Mass Fitness with your mobile number.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      eyebrow="Members"
      title={
        <>
          Log in or <em>sign up.</em>
        </>
      }
      intro="One mobile number, one account. We'll text you a code — there's no password to remember."
      footer={
        <>
          By continuing you agree to our{" "}
          <a href="/terms-and-conditions" className="link text-muted">
            terms
          </a>{" "}
          and{" "}
          <a href="/privacy-policy" className="link text-muted">
            privacy policy
          </a>
          .
        </>
      }
    >
      <LoginForm next={safeRedirectTarget(next)} />
    </AuthShell>
  );
}
