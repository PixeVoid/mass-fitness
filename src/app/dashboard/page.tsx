import type { Metadata } from "next";
import SignOutButton from "@/components/auth/SignOutButton";
import { getActiveSubscription, requireOnboardedProfile } from "@/lib/auth/dal";
import NextClassBanner from "@/components/classes/NextClassBanner";
import {
  buildNextClass,
  decideClassDoor,
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
import Icon, { IconBadge, IconLabel } from "@/components/ui/Icon";
import { glyphs } from "@/components/ui/glyphs";
import { started } from "@/lib/promises";
import FastLink from "@/components/ui/FastLink";

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
  "staff-no-payment":
    "You don't need a membership — you have access to every class as staff.",
};

/** How many upcoming sessions the dashboard lists. */
const DASHBOARD_CLASS_LIMIT = 8;

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
  // Deliberately wider than the eight shown. The cap is applied after
  // filtering by group — taking the soonest eight first meant a member whose
  // group's next session was ninth globally saw an empty schedule.
  const classesPromise = started(getUpcomingClasses(60));
  const cataloguePromise = started(getPricingCatalogue());
  const noticeParam = searchParams.then((params) => params.notice);

  // Redirects to /login when signed out and /onboarding when the profile is
  // incomplete — the proxy's optimistic check is not relied on here.
  const profile = await requireOnboardedProfile();

  // Trainers and admins run classes rather than buy them.
  const isStaff = profile.role === "trainer" || profile.role === "admin";

  // The subscription and the group memberships both need only `profile.id`,
  // so they go together. Asking for them one after the other — as this did —
  // spent a whole round trip waiting for an answer the second query never
  // needed.
  //
  // cataloguePromise is awaited but unread: it is in here to be *resolved*
  // before getPlan asks for it below, not for its value.
  const [subscription, classes, noticeKey, groupIds] = await Promise.all([
    getActiveSubscription(),
    classesPromise,
    noticeParam,
    isStaff ? Promise.resolve([]) : getMyGroupIds(profile.id),
    cataloguePromise,
  ]);
  const notice = noticeKey ? NOTICES[noticeKey] : undefined;

  // Everything below needs `groupIds` and nothing needs anything else, so the
  // three of them run together rather than in a chain. `getPlan` resolves off
  // the already-warm catalogue and `getMyGroups` off the request-cached ids,
  // so neither pays for what the other just fetched.
  const [plan, myGroups, visibleClasses] = await Promise.all([
    subscription
      ? getPlan(subscription.plan_tier, subscription.plan_duration)
      : null,
    isStaff ? [] : getMyGroups(profile.id),
    // One rule rather than a branch: `decideClassAccess` already returns "ok"
    // for staff, so passing the flag gets a coach the whole schedule without a
    // second definition of what staff can see sitting here.
    filterClassesForMember(
      classes,
      { groupIds, planTier: subscription?.plan_tier ?? null, isStaff },
      DASHBOARD_CLASS_LIMIT,
    ),
  ]);

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
          <div className="flex flex-wrap items-center gap-3">
            <IconLabel glyph={glyphs.dashboard}>Dashboard</IconLabel>
            {/* A trainer had no way to tell, from their own dashboard, that
                they were signed in as one — admins got a labelled button and
                trainers got nothing. The role is the thing that changes what
                every other control on this page does, so it is stated. */}
            {isStaff && (
              <span className="pick-badge">
                {profile.role === "admin" ? "Admin" : "Trainer"}
              </span>
            )}
          </div>
          <h1 className="display mt-4 text-[2.25rem] text-ink sm:text-[3rem]">
            Welcome back, <em>{profile.name}.</em>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {profile.role === "admin" && (
            <FastLink href="/admin" className="btn btn-outline btn-staff gap-2">
              <Icon glyph={glyphs.admin} size="sm" />
              Admin
            </FastLink>
          )}
          {isStaff && (
            <FastLink href="/coach" className="btn btn-outline btn-staff gap-2">
              <Icon glyph={glyphs.schedule} size="sm" />
              Schedule
            </FastLink>
          )}
          <SignOutButton />
        </div>
      </div>

      {awaitingGroup && (
        <div className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <IconLabel glyph={glyphs.groups}>One step left</IconLabel>
          <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-ink">
            Your membership is active, but you haven&rsquo;t picked a group yet
            — so there&rsquo;s nothing on your schedule. It takes a moment.
          </p>
          <FastLink href="/subscribe/group" className="btn btn-solid mt-6">
            Pick your group
          </FastLink>
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
        <IconLabel glyph={glyphs.membership}>
          {isStaff ? "Access" : "Membership"}
        </IconLabel>

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
            <FastLink href="/subscribe" className="btn btn-solid mt-6">
              See the plans
            </FastLink>
          </div>
        )}
      </section>

      {/* CLASSES */}
      <section className="mt-14 border-t border-line pt-8 sm:mt-20">
        <IconLabel glyph={glyphs.classes}>
          {isStaff ? "Upcoming classes" : "Your classes"}
        </IconLabel>

        {myGroups.length > 0 && (
          <p className="mt-4 text-[0.9375rem] text-muted">
            You&rsquo;re in{" "}
            {myGroups.map((group) => group.name).join(", ")}.
          </p>
        )}

        {visibleClasses.length === 0 ? (
          <div className="mt-6 flex items-start gap-4">
            <IconBadge glyph={glyphs.nothingScheduled} />
            <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted">
              Nothing on the schedule yet. New sessions are published a week
              ahead.
            </p>
          </div>
        ) : (
          <ul className="mt-6">
            {visibleClasses.map((item) => {
              // Mirrors the rule in /api/live/token: whoever is running the
              // class is not a customer of it. Without this a trainer whose
              // own membership lapsed gets "Members only" on the class they
              // are supposed to be teaching — the token route would have let
              // them in, but the dashboard gives them no way to ask.
              const isHost =
                profile.role === "admin" || item.trainer_id === profile.id;
              // The same door the token route enforces, asked the same way.
              // Reading `classWindow` here instead meant a coach saw "Not
              // started" with no button on a class the server would happily
              // have let them into — no way to go and set up, and no way to
              // teach a session that had overrun its slot.
              const door = decideClassDoor(item, { isStaff: isStaff || isHost });
              const locked = item.is_premium && !subscription && !isStaff && !isHost;

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
                    <span className="flex items-center gap-1.5">
                      <Icon glyph={glyphs.time} size="sm" />
                      <span className="numeric">
                        {formatClassTime(item.scheduled_at)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon glyph={glyphs.duration} size="sm" />
                      <span className="numeric">{item.duration_minutes} min</span>
                    </span>
                  </div>

                  <div className="lg:col-span-3 lg:justify-self-end">
                    {locked ? (
                      <FastLink href="/subscribe" className="btn btn-outline w-full sm:w-auto">
                        Members only
                      </FastLink>
                    ) : door === "open" ? (
                      <FastLink
                        href={`/live/${item.id}`}
                        className="btn btn-solid w-full sm:w-auto"
                      >
                        {isHost ? "Start class" : isStaff ? "Sit in" : "Join now"}
                      </FastLink>
                    ) : (
                      <span className="label text-faint">
                        {door === "closed" ? "Ended" : "Not started"}
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
