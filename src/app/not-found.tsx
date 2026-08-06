import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * The 404, which until now was Next's stock page.
 *
 * More than a cosmetic gap. `notFound()` is what `requireCoach()` and
 * `requireAdmin()` call — deliberately, so a probe cannot tell an admin route
 * from a missing one — so the page a trainer saw when they touched /admin was
 * an unstyled black-on-white "404 | This page could not be found", with no
 * header and no way back into the site. The same page answered a mistyped
 * blog URL and a cancelled class.
 *
 * It carries the site header, so wherever someone landed here from, there is
 * a way onward that does not involve the back button.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto flex w-full max-w-[700px] flex-1 flex-col px-5 pb-24 sm:px-8">
        <HeaderSpacer />

        <p className="label text-faint">404</p>
        <h1 className="display mt-5 text-[2.25rem] text-ink sm:text-[3rem]">
          That page isn&rsquo;t <em>here.</em>
        </h1>
        <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-muted">
          It may have moved, or the link may be wrong. If you were signed in and
          expected to see something, your account may not have access to it.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn btn-solid">
            Back to the site
          </Link>
          <Link href="/dashboard" className="btn btn-outline">
            Your dashboard
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
