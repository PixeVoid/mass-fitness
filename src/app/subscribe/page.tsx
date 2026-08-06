import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import { getActiveSubscription, requireOnboardedProfile } from "@/lib/auth/dal";
import { formatPaise } from "@/lib/plans";
import { getPlans } from "@/lib/pricing";
import PlanPicker from "./PlanPicker";

export const metadata: Metadata = {
  title: "Choose your plan",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "unknown-plan": "That plan isn't available. Pick one below.",
  gateway:
    "We couldn't reach the payment gateway. Nothing was charged — try again in a moment.",
  cancelled: "That payment didn't go through. Nothing was charged.",
};

/**
 * Checkout (BUILD_PLAN Phase 3).
 *
 * Behind auth deliberately, unlike the pricing section on the landing page.
 * Buying requires an account anyway — the membership has to attach to
 * somebody — so sending people through login first is one redirect rather than
 * a payment flow interrupted halfway.
 */
export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; plan?: string }>;
}) {
  const profile = await requireOnboardedProfile();

  // Staff are not customers. A trainer who followed a pricing link — or was
  // sent here by a paywall that should never have fired on them — was being
  // shown a bill for the classes they teach.
  if (profile.role === "trainer" || profile.role === "admin") {
    redirect("/dashboard?notice=staff-no-payment");
  }

  // Nothing to sell someone who already has a live membership.
  if (await getActiveSubscription()) {
    redirect("/dashboard?notice=already-subscribed");
  }

  const [{ error, plan: preselected }, plans] = await Promise.all([
    searchParams,
    getPlans(),
  ]);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-[900px] px-5 pb-20 sm:px-8 sm:pb-28">
        <HeaderSpacer />

        <p className="label text-faint">Membership</p>
        <h1 className="display mt-5 text-[2.25rem] text-ink sm:text-[3rem]">
          Pick your <em>commitment.</em>
        </h1>
        <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-muted">
          Longer terms cost less per month. Paid once up front — no auto-renewal
          and nothing stored against your card by us.
        </p>

        {error && ERRORS[error] && (
          <p
            role="alert"
            className="mt-8 border-l border-line-strong pl-5 text-[0.9375rem] leading-relaxed text-ink"
          >
            {ERRORS[error]}
          </p>
        )}

        <div className="mt-12">
          <PlanPicker
            plans={plans.map((p) => ({
              id: p.id,
              tier: p.tier,
              duration: p.duration,
              label: p.label,
              durationLabel: p.durationLabel,
              summary: p.summary,
              perks: p.perks,
              featured: p.featured,
              months: p.months,
              amount: formatPaise(p.amountPaise),
              perMonth: formatPaise(p.perMonthPaise),
            }))}
            preselected={preselected}
          />
        </div>

        <p className="mt-12 max-w-lg text-[0.8125rem] leading-relaxed text-faint">
          By subscribing you agree to our{" "}
          <Link href="/terms-and-conditions" className="link text-faint">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/refund-policy" className="link text-faint">
            refund policy
          </Link>
          .
        </p>
      </main>
    </>
  );
}
