import Link from "next/link";
import Footer from "@/components/Footer";
import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import { getVisitorState } from "@/lib/auth/dal";
import { formatPaise } from "@/lib/plans";
import { getPlans } from "@/lib/pricing";

/**
 * Shell for the search landing pages.
 *
 * These target commercial queries the homepage cannot rank for on its own —
 * one page can be *about* one thing, and the homepage is already about five.
 *
 * The line these must not cross is the doorway page: near-identical pages spun
 * up per keyword with the search term swapped in. Google penalises that
 * specifically, and it deserves to. So this component supplies only the
 * furniture every page shares — header, price table, CTA, footer — and each
 * page brings genuinely different substance. If two of them ever start reading
 * the same, delete one.
 */

export interface LandingSection {
  heading: string;
  body: string[];
  /** Optional bulleted points under the prose. */
  points?: string[];
}

export default async function SeoLandingPage({
  eyebrow,
  title,
  intro,
  sections,
  closing,
}: {
  eyebrow: string;
  /** The <h1>. One per page, and it should read as a sentence, not a keyword. */
  title: React.ReactNode;
  intro: string;
  sections: LandingSection[];
  closing: string;
}) {
  const [plans, visitor] = await Promise.all([getPlans(), getVisitorState()]);
  // Same rule as the landing page: don't sell a plan to someone who has one.
  const ctaHref = visitor.covered ? "/dashboard" : "/subscribe";
  const monthly = plans.filter((plan) => plan.duration === "monthly");

  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8 sm:pb-32">
        <HeaderSpacer />

        <p className="label text-faint">{eyebrow}</p>
        <h1 className="display mt-5 text-[2.25rem] text-ink sm:text-[3rem]">
          {title}
        </h1>
        <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-muted">
          {intro}
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href={ctaHref} className="btn btn-solid">
            {visitor.covered ? "Go to your dashboard" : "See the plans"}
          </Link>
          <Link href="/assessment" className="btn btn-ai">
            Get your fitness score
          </Link>
        </div>

        {sections.map((section, index) => (
          <section
            key={section.heading}
            className="mt-16 border-t border-line pt-10"
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-12">
              <span className="label numeric text-faint sm:col-span-2">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="sm:col-span-10">
                <h2 className="display-sm text-[1.5rem] text-ink sm:text-[1.75rem]">
                  {section.heading}
                </h2>
                <div className="mt-5 space-y-4 text-[0.9375rem] leading-relaxed text-muted">
                  {section.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
                {section.points && (
                  <ul className="mt-6 space-y-3">
                    {section.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-3 text-[0.9375rem] leading-relaxed text-muted"
                      >
                        <span aria-hidden="true" className="shrink-0 text-faint">
                          &mdash;
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        ))}

        {/* Prices live in the database and are admin-editable, so they are read
            here rather than written into each page's copy — three landing pages
            quoting a stale figure is exactly how a price change goes wrong. */}
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="display-sm text-[1.5rem] text-ink sm:text-[1.75rem]">
            What it costs
          </h2>
          <ul className="mt-8 flex flex-col gap-px bg-line">
            {monthly.map((plan) => (
              <li
                key={plan.tier}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 bg-paper py-5"
              >
                <div>
                  <p className="display-sm text-[1.25rem] text-ink">
                    {plan.label}
                  </p>
                  <p className="mt-1 max-w-md text-[0.9375rem] text-muted">
                    {plan.summary}
                  </p>
                </div>
                <p className="numeric text-[1.125rem] text-ink">
                  {formatPaise(plan.amountPaise)}
                  <span className="label ml-2 text-faint">per month</span>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[0.9375rem] leading-relaxed text-muted">
            Quarterly and annual terms cost less per month. Paid once up front —
            nothing renews automatically.
          </p>
        </section>

        <section className="mt-16 border-t border-line pt-10">
          <p className="display-sm max-w-xl text-[1.5rem] text-ink sm:text-[1.75rem]">
            {closing}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={ctaHref} className="btn btn-solid">
              {visitor.covered ? "Go to your dashboard" : "Start training"}
            </Link>
            <Link href="/faq" className="btn btn-outline">
              Read the FAQ
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
