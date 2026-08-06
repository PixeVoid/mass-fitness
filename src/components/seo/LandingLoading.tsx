import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import {
  SkeletonHeading,
  SkeletonLabel,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

/**
 * One skeleton for all three search landing pages, since they share one
 * component. Writing three near-identical copies is how they drift apart.
 */
export default function LandingLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[820px] px-5 pb-24 sm:px-8 sm:pb-32">
        <HeaderSpacer />
        <SkeletonScreen label="Loading…">
          <SkeletonHeading />
          <div className="mt-10 flex gap-3" aria-hidden="true">
            <SkeletonLine className="h-11 w-36 rounded-full" />
            <SkeletonLine className="h-11 w-44 rounded-full" />
          </div>
          <div className="mt-16 flex flex-col gap-12" aria-hidden="true">
            {[0, 1, 2].map((section) => (
              <div key={section}>
                <SkeletonLabel className="w-32" />
                <SkeletonLine className="mt-4 h-7 w-[min(24rem,80%)]" />
                <div className="mt-5 flex flex-col gap-3">
                  {[0, 1, 2].map((line) => (
                    <SkeletonLine
                      key={line}
                      className={`h-4 ${line === 2 ? "w-[65%]" : "w-full"}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SkeletonScreen>
      </main>
    </>
  );
}
