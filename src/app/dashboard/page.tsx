import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { getActiveSubscription, requireOnboardedProfile } from "@/lib/auth/dal";
import {
  classWindow,
  formatClassTime,
  getUpcomingClasses,
} from "@/lib/classes";
import { formatPaise, getPlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Your dashboard",
  robots: { index: false, follow: false },
};

// Per-user by definition. Marked explicitly because the session lookup throws
// on missing config before it ever reaches `cookies()`, so Next would
// otherwise try to prerender this at build time and fail.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Redirects to /login when signed out and /onboarding when the profile is
  // incomplete — the proxy's optimistic check is not relied on here.
  const profile = await requireOnboardedProfile();
  const [subscription, classes] = await Promise.all([
    getActiveSubscription(),
    getUpcomingClasses(),
  ]);

  const plan = subscription
    ? getPlan(subscription.plan_tier, subscription.plan_duration)
    : null;

  return (
    <main className="mx-auto w-full max-w-[1000px] px-5 py-16 sm:px-8 sm:py-24">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="label text-faint">Dashboard</p>
          <h1 className="display mt-4 text-[2.25rem] text-ink sm:text-[3rem]">
            Welcome back, <em>{profile.name}.</em>
          </h1>
        </div>

        <form action={signOut}>
          <button type="submit" className="btn btn-outline">
            Sign out
          </button>
        </form>
      </div>

      {/* MEMBERSHIP */}
      <section className="mt-14 border-t border-line pt-8 sm:mt-20">
        <h2 className="label text-faint">Membership</h2>

        {subscription && plan ? (
          <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-3">
            <p className="display-sm text-[1.75rem] text-ink">
              {plan.label}
              <span className="text-faint"> · {plan.durationLabel}</span>
            </p>
            <p className="numeric text-[0.9375rem] text-muted">
              {formatPaise(subscription.amount_paise)}
            </p>
            {subscription.end_date && (
              <p className="text-[0.9375rem] text-muted">
                Renews {formatClassTime(subscription.end_date)}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted">
              You don&apos;t have an active membership yet. Live classes stay
              locked until one is active.
            </p>
            {/* Points at the pricing section until Phase 3 ships a real
                checkout at /subscribe. */}
            <Link href="/#pricing" className="btn btn-solid mt-6">
              See the plans
            </Link>
          </div>
        )}
      </section>

      {/* CLASSES */}
      <section className="mt-14 border-t border-line pt-8 sm:mt-20">
        <h2 className="label text-faint">Upcoming classes</h2>

        {classes.length === 0 ? (
          <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-muted">
            Nothing on the schedule yet. New sessions are published a week
            ahead.
          </p>
        ) : (
          <ul className="mt-6">
            {classes.map((item) => {
              const window = classWindow(item);
              const locked = item.is_premium && !subscription;

              return (
                <li
                  key={item.id}
                  className="grid grid-cols-1 items-baseline gap-x-8 gap-y-3 border-t border-line py-6 first:border-t-0 sm:py-8 lg:grid-cols-12"
                >
                  <div className="lg:col-span-5">
                    <h3 className="display-sm text-[1.375rem] text-ink sm:text-[1.5rem]">
                      {item.title}
                    </h3>
                    {item.trainer_name && (
                      <p className="mt-1 text-[0.9375rem] text-muted">
                        with {item.trainer_name}
                      </p>
                    )}
                  </div>

                  <div className="label flex flex-wrap items-center gap-x-4 gap-y-2 text-faint lg:col-span-4">
                    <span className="numeric">
                      {formatClassTime(item.scheduled_at)}
                    </span>
                    <span className="numeric">{item.duration_minutes} min</span>
                  </div>

                  <div className="lg:col-span-3 lg:justify-self-end">
                    {locked ? (
                      <Link href="/#pricing" className="btn btn-outline w-full sm:w-auto">
                        Members only
                      </Link>
                    ) : window === "open" ? (
                      <Link
                        href={`/live/${item.id}`}
                        className="btn btn-solid w-full sm:w-auto"
                      >
                        Join now
                      </Link>
                    ) : (
                      <span className="label text-faint">
                        {window === "ended" ? "Ended" : "Not started"}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
