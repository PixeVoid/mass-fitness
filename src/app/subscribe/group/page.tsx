import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import {
  getActiveSubscription,
  requireOnboardedProfile,
} from "@/lib/auth/dal";
import {
  getAvailableCoaches,
  getJoinableGroups,
  getMyGroupIds,
} from "@/lib/groups";
import { CoachChoices, GroupChoices } from "./GroupPicker";

export const metadata: Metadata = {
  title: "Choose your group",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The step between paying and having a dashboard worth looking at.
 *
 * Asked here, immediately after payment, because that is the one moment the
 * member is definitely engaged — and because until they are in a group their
 * schedule is empty and the product looks broken. Someone who abandons this
 * page is not stuck: /dashboard chases them, and an admin can assign them.
 */
export default async function ChooseGroupPage() {
  const profile = await requireOnboardedProfile();
  const subscription = await getActiveSubscription();

  if (!subscription) redirect("/subscribe");

  // Already sorted — nothing to choose.
  const existing = await getMyGroupIds(profile.id);
  if (existing.length > 0) redirect("/dashboard");

  const isOneToOne = subscription.plan_tier === "one_to_one";
  const [groups, coaches] = await Promise.all([
    isOneToOne ? Promise.resolve([]) : getJoinableGroups("group"),
    isOneToOne ? getAvailableCoaches() : Promise.resolve([]),
  ]);

  const nothingAvailable = isOneToOne
    ? coaches.length === 0
    : groups.length === 0;

  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-[760px] px-5 pb-20 sm:px-8 sm:pb-28">
        <HeaderSpacer />

        <p className="label text-faint">You&rsquo;re in</p>
        <h1 className="display mt-5 text-[2.25rem] text-ink sm:text-[2.75rem]">
          {isOneToOne ? (
            <>
              Now pick your <em>coach.</em>
            </>
          ) : (
            <>
              One last thing — pick your <em>group.</em>
            </>
          )}
        </h1>
        <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-muted">
          {isOneToOne
            ? "Your sessions are yours alone, so this is the person you'll be training with. Times are agreed directly with them once you're set up."
            : "You'll train with the same coach and the same people each week — that's what makes the coaching add up rather than reset every session. You can change later by asking us."}
        </p>

        <div className="mt-12">
          {nothingAvailable ? (
            // Every group full, or no coach taking clients. Says so plainly
            // instead of showing an empty list that reads as a broken page.
            <div className="border-l border-line-strong pl-6">
              <p className="text-[0.9375rem] leading-relaxed text-ink">
                {isOneToOne
                  ? "Every coach is at capacity right now."
                  : "Every group is full right now."}
              </p>
              <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">
                Your membership is active and nothing is lost — we just need to
                open a new one for you. Message us and we&rsquo;ll sort it
                today.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="https://wa.me/916207524549"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-solid"
                >
                  Message us on WhatsApp
                </a>
                <Link href="/dashboard" className="btn btn-outline">
                  Back to dashboard
                </Link>
              </div>
            </div>
          ) : isOneToOne ? (
            <CoachChoices
              coaches={coaches.map((coach) => ({
                id: coach.id,
                name: coach.name,
                slotsLeft: coach.capacity - coach.clients,
              }))}
            />
          ) : (
            <GroupChoices
              groups={groups.map((group) => ({
                id: group.id,
                name: group.name,
                focus: group.focus,
                trainerName: group.trainerName,
                scheduleHint: group.schedule_hint,
                spacesLeft: group.spacesLeft,
                capacity: group.capacity,
              }))}
            />
          )}
        </div>
      </main>
    </>
  );
}
