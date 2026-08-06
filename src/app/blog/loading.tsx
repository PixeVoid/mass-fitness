import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import {
  SkeletonHeading,
  SkeletonLabel,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

/** Matches the blog index: title, then rows with a cover thumbnail. */
export default function BlogLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[900px] px-5 pb-24 sm:px-8 sm:pb-32">
        <HeaderSpacer />
        <SkeletonScreen label="Loading the journal…">
          <SkeletonHeading />
          <div className="mt-20" aria-hidden="true">
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-line py-8 sm:grid-cols-[1fr_auto] sm:py-10"
              >
                <div>
                  <SkeletonLabel className="w-36" />
                  <SkeletonLine className="mt-4 h-7 w-[min(26rem,85%)]" />
                  <SkeletonLine className="mt-3 h-4 w-[min(20rem,70%)]" />
                </div>
                <div className="skeleton h-40 w-full rounded-xl sm:h-28 sm:w-44" />
              </div>
            ))}
          </div>
        </SkeletonScreen>
      </main>
    </>
  );
}
