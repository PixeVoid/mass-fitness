import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { getActiveSubscription, requireOnboardedProfile } from "@/lib/auth/dal";
import NextClassBanner from "@/components/classes/NextClassBanner";
import {
  buildNextClass,
  classWindow,
  formatClassTime,
  getUpcomingClasses,
} from "@/lib/classes";
import { formatPaise } from "@/lib/plans";
import {
  filterClassesForMember,
  getMyGroupIds,
  getMyGroups,
  needsGroup,
} from "@/lib/groups";
import { getPlan, getPricingCatalogue } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Your dashboard",
  robots: { index: false, follow: false },
};

// Per-user by definition. Marked explicitly because the session lookup throws
// on missing config before it ever reaches `cookies()`, so Next would
// otherwise try to prerender this at build time and fail.
export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  subscribed: "You're in. Your membership is active and live classes are unlocked.",
  "already-subscribed": "You already have an active membership — nothing more to pay.",
  "group-joined": "You're in the group. Your coach knows you're coming.",
  "coach-assigned": "Your coach has been told. They'll be in touch to agree your times.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  // The schedule and the price list are the same for everyone, so neither has
  // to wait to find out who is asking. Started here, they overlap the session
  // read instead of queueing behind it — this page used to run profile, then
  // subscription, then plan as three separate round trips, and the wait was
  // the sum of all of them.
  const classesPromise = getUpcomingClasses();
  const cataloguePromise = getPricingCatalogue();
  const noticeParam = searchParams.then((params) => params.notice);

  // Redirects to /login when signed out and /onboarding when the profile is
  // incomplete — the proxy's optimistic check is not relied on here.
  const profile = await requireOnboardedProfile();

  // cataloguePromise is awaited but unread: it is in here to be *resolved*
  // before getPlan asks for it below, not for its value.
  const [subscription, classes, noticeKey] = await Promise.all([
    getActiveSubscription(),
    classesPromise,
    noticeParam,
    cataloguePromise,
  ]);
  const notice = noticeKey ? NOTICES[noticeKey] : undefined;

  // Trainers and admins run classes rather than buy them.
  const isStaff = profile.role === "trainer" || profile.role === "admin";

  // Resolves off the already-warm catalogue rather than issuing its own query.
  const plan = subscription
    ? await getPlan(subscription.plan_tier, subscription.plan_duration)
    : null;

  // Which classes are actually this member's. Staff see the whole schedule —
  // a coach needs to know what else is running, and an unassigned coach would
  // otherwise see nothing at all.
  const groupIds = isStaff ? [] : await getMyGroupIds(profile.id);
  const myGroups = isStaff ? [] : await getMyGroups(profile.id);
  const visibleClasses = isStaff
    ? classes
    : await filterClassesForMember(classes, groupIds);

  const awaitingGroup = needsGroup(profile, Boolean(subscription), groupIds.length);

  const { nextClass, nowMs } = buildNextClass(
    visibleClasses,
    profile,
    Boolean(subscription),
  );

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="label text-faint">Dashboard</p>
          <h1 className="display mt-4 text-[2.25rem] text-ink sm:text-[3rem]">
            Welcome back, <em>{profile.name}.</em>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {profile.role === "admin" && (
            <Link href="/admin" className="btn btn-outline">
              Admin
            </Link>
          )}
          {(profile.role === "trainer" || profile.role === "admin") && (
            <Link href="/coach" className="btn btn-outline">
              Schedule
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className="btn btn-outline">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {awaitingGroup && (
        <div className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <p className="label text-faint">One step left</p>
          <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-ink">
            Your membership is active, but you haven&rsquo;t picked a group yet
            — so there&rsquo;s nothing on your schedule. It takes a moment.
          </p>
          <Link href="/subscribe/group" className="btn btn-solid mt-6">
            Pick your group
          </Link>
        </div>
      )}

      {nextClass && (
        <NextClassBanner nextClass={nextClass} serverNowMs={nowMs} />
      )}

      {notice && (
        <p
          role="status"
          className="mt-10 border-l border-line-strong pl-5 text-[0.9375rem] leading-relaxed text-ink"
        >
          {notice}
        </p>
      )}

      {/* MEMBERSHIP */}
      <section className="mt-14 border-t border-line pt-8 sm:mt-20">
        <h2 className="label text-faint">
          {isStaff ? "Access" : "Membership"}
        </h2>

        {isStaff && !subscription ? (
          // Staff are not customers. Telling a coach their classes are locked
          // is both wrong and alarming.
          <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-muted">
            You&apos;re signed in as {profile.role === "admin" ? "an admin" : "a trainer"}.
            No membership needed — you have access to the classes you run.
          </p>
        ) : subscription && plan ? (
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
            <Link href="/subscribe" className="btn btn-solid mt-6">
              See the plans
            </Link>
          </div>
        )}
      </section>

      {/* CLASSES */}
      <section className="mt-14 border-t border-line pt-8 sm:mt-20">
        <h2 className="label text-faint">
          {isStaff ? "Upcoming classes" : "Your classes"}
        </h2>

        {myGroups.length > 0 && (
          <p className="mt-4 text-[0.9375rem] text-muted">
            You&rsquo;re in{" "}
            {myGroups.map((group) => group.name).join(", ")}.
          </p>
        )}

        {visibleClasses.length === 0 ? (
          <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-muted">
            Nothing on the schedule yet. New sessions are published a week
            ahead.
          </p>
        ) : (
          <ul className="mt-6">
            {visibleClasses.map((item) => {
              const window = classWindow(item);
              // Mirrors the rule in /api/live/token: whoever is running the
              // class is not a customer of it. Without this a trainer whose
              // own membership lapsed gets "Members only" on the class they
              // are supposed to be teaching — the token route would have let
              // them in, but the dashboard gives them no way to ask.
              const isHost =
                profile.role === "admin" || item.trainer_id === profile.id;
              const locked = item.is_premium && !subscription && !isHost;

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
                      <Link href="/subscribe" className="btn btn-outline w-full sm:w-auto">
                        Members only
                      </Link>
                    ) : window === "open" ? (
                      <Link
                        href={`/live/${item.id}`}
                        className="btn btn-solid w-full sm:w-auto"
                      >
                        {isHost ? "Start class" : "Join now"}
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
    </>
  );
}
