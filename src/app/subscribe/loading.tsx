import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import {
  SkeletonHeading,
  SkeletonLabel,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

/** Matches /subscribe: the tier pair, then the term rows. */
export default function SubscribeLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[900px] px-5 pb-20 sm:px-8 sm:pb-28">
        <HeaderSpacer />
        <SkeletonScreen label="Loading the plans…">
          <SkeletonHeading />

          <div className="mt-12 grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-2">
            {[0, 1].map((tier) => (
              <div key={tier} className="bg-paper p-6 sm:p-8">
                <SkeletonLine className="h-7 w-32" />
                <SkeletonLine className="mt-4 h-4 w-full" />
                <div className="mt-6 flex flex-col gap-2.5 border-t border-line pt-5">
                  {[0, 1, 2, 3].map((perk) => (
                    <SkeletonLine key={perk} className="h-3.5 w-44" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-px border-t border-line bg-line">
            {[0, 1, 2].map((term) => (
              <div
                key={term}
                className="flex items-center justify-between bg-paper p-5 sm:p-6"
              >
                <SkeletonLine className="h-6 w-28" />
                <SkeletonLabel className="w-24" />
              </div>
            ))}
          </div>
        </SkeletonScreen>
      </main>
    </>
  );
}
