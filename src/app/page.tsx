import type { CSSProperties } from "react";
import Link from "next/link";
import ClassGrid from "@/components/ClassGrid";
import Footer from "@/components/Footer";
import SectionHeading from "@/components/SectionHeading";
import SiteHeader from "@/components/SiteHeader";
import StackScrollContainer from "@/components/StackScrollContainer";
import StatRow from "@/components/StatRow";
import { StructuredData } from "@/components/StructuredData";
import {
  DumbbellIcon,
  StopwatchIcon,
  TargetIcon,
  UsersIcon,
} from "@/components/icons";
import { getVisitorState } from "@/lib/auth/dal";
import { formatPaise } from "@/lib/plans";
import { getPlans } from "@/lib/pricing";
import type { PlanTier } from "@/lib/db-types";

const STEPS = [
  {
    title: "Set your goal",
    body: "Tell us what you're training for — strength, fat loss, mobility, or general conditioning. We benchmark where you're starting from.",
    icon: TargetIcon,
  },
  {
    title: "Get matched",
    body: "We slot you into live sessions and a home plan that fit your goal, your schedule, and the space you actually have.",
    icon: UsersIcon,
  },
  {
    title: "Train and adjust",
    body: "Join from laptop or phone. Your coach corrects your setup, and the programme moves as you do.",
    icon: StopwatchIcon,
  },
];

const PLAN_ICONS: Record<PlanTier, typeof UsersIcon> = {
  group: UsersIcon,
  one_to_one: TargetIcon,
};

export default async function Home() {
  // Whether there is anything left to sell this visitor. The landing page is
  // the same page for everyone, but its calls to action are not: an admin, a
  // coach and a paid-up member were all being pushed back into checkout.
  const [plans, visitor] = await Promise.all([getPlans(), getVisitorState()]);
  const classesHref = visitor.covered ? "/dashboard" : "#pricing";
  const monthlyPlans = plans.filter((plan) => plan.duration === "monthly");

  return (
    <>
      <StructuredData monthlyPlans={monthlyPlans} />
      <SiteHeader />

      <main id="top" className="px-2.5 pt-2 sm:px-4 sm:pt-3 lg:px-5">
        {/* Hero + five feature cards, stacked on scroll */}
        <section id="features">
          <StackScrollContainer />
        </section>

        <StatRow />

        {/* CLASSES */}
        <section
          id="classes"
          className="relative mx-auto w-full max-w-[1400px] overflow-hidden px-5 py-24 sm:px-8 sm:py-32 lg:px-12"
        >
          {/* Oversized line-art dumbbell, kept at the same low-contrast
              treatment as the footer's wordmark watermark — a visual anchor
              for the one section that's literally a list of gym classes. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-[22rem] w-[22rem] -rotate-12 text-ink opacity-[0.06] sm:h-[30rem] sm:w-[30rem]"
          >
            <DumbbellIcon />
          </div>

          <SectionHeading
            label="The schedule"
            title={
              <>
                Four tracks. Every one <em>progressive.</em>
              </>
            }
            body="Load, volume and complexity step up week over week. Pick the stimulus — we handle the periodisation."
          />
          <ClassGrid href={classesHref} />
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12"
        >
          <SectionHeading label="Getting started" title="Three steps to your first class." />

          <ol className="mt-16 grid grid-cols-1 gap-x-8 sm:mt-20 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                data-reveal=""
                style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
                className="border-t border-line pt-8 sm:pt-10"
              >
                <div className="flex items-center justify-between">
                  <span className="label numeric text-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-sunk text-muted"
                  >
                    <span className="block h-5 w-5">
                      <step.icon />
                    </span>
                  </span>
                </div>
                <h3 className="display-sm mt-6 text-[1.5rem] text-ink sm:text-[1.75rem]">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-xs text-[0.9375rem] leading-relaxed text-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* PRICING */}
        <section
          id="pricing"
          className="mx-auto w-full max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12"
        >
          <SectionHeading
            label="Membership"
            title="One membership. Pick your commitment."
            body="No lock-in, no joining fee. Switch or cancel at the end of any month."
          />

          <div className="plan-grid mt-16 grid grid-cols-1 gap-px border-t border-line bg-line sm:mt-20 lg:grid-cols-2">
            {monthlyPlans.map((plan, index) => {
              const PlanIcon = PLAN_ICONS[plan.tier];
              return (
                <div
                  key={plan.tier}
                  data-reveal=""
                  style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
                  className={`plan flex flex-col p-8 sm:p-10 ${
                    plan.featured ? "plan-featured" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-sunk text-muted"
                      >
                        <span className="block h-4 w-4">
                          <PlanIcon />
                        </span>
                      </span>
                      <h3 className="display-sm text-[1.75rem] text-ink">{plan.label}</h3>
                    </div>
                    {plan.featured && (
                      <span className="label text-faint">Most chosen</span>
                    )}
                  </div>

                  <p className="mt-4 min-h-[3.25rem] max-w-xs text-[0.9375rem] leading-relaxed text-muted">
                    {plan.summary}
                  </p>

                  <div className="mt-8 flex items-baseline gap-2">
                    <span className="numeric text-4xl tracking-tight text-ink">
                      {formatPaise(plan.amountPaise)}
                    </span>
                    <span className="label text-faint">per month</span>
                  </div>

                  <ul className="mt-8 flex flex-1 flex-col gap-3 border-t border-line pt-8">
                    {plan.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-baseline gap-3 text-[0.9375rem] text-muted"
                      >
                        <span aria-hidden="true" className="text-faint">
                          &mdash;
                        </span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Straight into checkout with this tier preselected.
                      /subscribe is behind auth, so an anonymous visitor gets
                      the login screen and lands back here after — one redirect
                      rather than a mailto and a hope.

                      Unless there is nothing to sell them. A member who has
                      already paid, and staff who never pay at all, were being
                      offered a second purchase of what they have; that reads
                      as a broken site, and for a member it is a real risk of
                      being charged twice. */}
                  <Link
                    href={visitor.covered ? "/dashboard" : `/subscribe?plan=${plan.id}`}
                    className="btn plan-cta mt-10 w-full"
                  >
                    {visitor.isStaff
                      ? "Go to your dashboard"
                      : visitor.covered
                        ? "You're on this — open dashboard"
                        : `Choose ${plan.label.toLowerCase()}`}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* CONTACT */}
        <section
          id="contact"
          className="mx-auto w-full max-w-[1400px] px-5 py-28 sm:px-8 sm:py-40 lg:px-12"
        >
          <div className="border-t border-line pt-16 sm:pt-20">
            <h2
              data-reveal=""
              className="display max-w-3xl text-[2.5rem] text-ink sm:text-[3.5rem] lg:text-[4.25rem]"
            >
              Your gym is wherever you <em>unroll a mat.</em>
            </h2>

            <p
              data-reveal=""
              style={{ "--reveal-delay": "100ms" } as CSSProperties}
              className="mt-8 max-w-md text-[0.9375rem] leading-relaxed text-muted sm:text-base"
            >
              Get matched to a live class this week. No equipment and no lock-in
              contract to start.
            </p>

            <div
              data-reveal=""
              style={{ "--reveal-delay": "180ms" } as CSSProperties}
              className="mt-10 flex flex-col gap-3 sm:flex-row"
            >
              <a
                href="https://wa.me/916207524549"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-solid"
              >
                Message us on WhatsApp
              </a>
              <a href="mailto:fitnessbymass@gmail.com" className="btn btn-outline">
                Email us
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
