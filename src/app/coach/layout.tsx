import type { Metadata } from "next";
import SignOutButton from "@/components/auth/SignOutButton";
import Icon, { IconBadge, IconLabel } from "@/components/ui/Icon";
import { glyphs } from "@/components/ui/glyphs";
import { requireCoach } from "@/lib/auth/dal";
import FastLink from "@/components/ui/FastLink";

export const metadata: Metadata = {
  title: "Coach",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The coach area — deliberately small.
 *
 * Not a cut-down /admin. A trainer sees their own timetable and nothing else:
 * no member list, no leads, no pricing, no payment records. Keeping it a
 * separate route rather than a permission level inside the admin panel means
 * there is no page where "did I remember to hide this from trainers?" is a
 * question anyone has to ask.
 *
 * Same caveat as the admin layout: this gate is a convenience. Layouts do not
 * re-render on every navigation and Server Actions bypass them entirely, so
 * each page and each action calls `requireCoach()` itself — and the ownership
 * rules live in Postgres underneath all of it.
 */
export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const coach = await requireCoach();

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 py-12 sm:px-8 sm:py-16">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-6">
        <div className="flex items-center gap-4">
          <IconBadge glyph={glyphs.coach} />
          <div>
            <IconLabel glyph={glyphs.schedule}>Mass Fitness coach</IconLabel>
            <p className="mt-2 text-[0.9375rem] text-muted">
              {coach.name ?? "Coach"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {coach.role === "admin" && (
            <FastLink href="/admin" className="btn btn-outline gap-2">
              <Icon glyph={glyphs.admin} size="sm" />
              Admin
            </FastLink>
          )}
          <FastLink href="/dashboard" className="btn btn-outline gap-2">
            <Icon glyph={glyphs.dashboard} size="sm" />
            Dashboard
          </FastLink>
          <SignOutButton />
        </div>
      </header>

      <main id="main" className="mt-10">{children}</main>
    </div>
  );
}
