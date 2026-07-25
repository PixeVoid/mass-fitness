import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { safeRedirectTarget } from "@/lib/routes";
import OnboardingForm from "./OnboardingForm";

export const metadata: Metadata = {
  title: "Complete your profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await requireUser();
  const profile = await getProfile();
  const { next } = await searchParams;
  const target = safeRedirectTarget(next);

  // Already onboarded — nothing to collect, so don't make them retype it.
  if (profile?.onboarded_at) {
    redirect(target);
  }

  return (
    <AuthShell
      eyebrow="One last thing"
      title={
        <>
          Who are we <em>training?</em>
        </>
      }
      intro={user.email ? `Signed in as ${user.email}.` : undefined}
    >
      <OnboardingForm
        next={target}
        defaultName={profile?.name}
        defaultPhone={profile?.phone}
      />
    </AuthShell>
  );
}
