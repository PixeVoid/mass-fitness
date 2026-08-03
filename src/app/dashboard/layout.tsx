import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

/**
 * The header and page frame live here rather than in page.tsx so that
 * loading.tsx renders *inside* them. Navigating to the dashboard then paints
 * the real header immediately and streams only the member-specific panels,
 * instead of holding a blank page until every query has come back.
 *
 * The identity read this costs is free in practice: page.tsx asks for the same
 * profile, and React's per-request `cache()` collapses the two into one query.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1000px] px-5 pb-16 sm:px-8 sm:pb-24">
        <HeaderSpacer />
        {children}
      </main>
    </>
  );
}
