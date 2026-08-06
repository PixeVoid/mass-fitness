import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import {
  SkeletonHeading,
  SkeletonLabel,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

/** Matches the FAQ: title, then question groups. */
export default function FaqLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8 sm:pb-32">
        <HeaderSpacer />
        <SkeletonScreen label="Loading the questions…">
          <SkeletonHeading />
          <div className="mt-16 flex flex-col gap-12" aria-hidden="true">
            {[0, 1].map((group) => (
              <div key={group}>
                <SkeletonLabel className="w-28" />
                <div className="mt-6 flex flex-col">
                  {[0, 1, 2].map((q) => (
                    <div key={q} className="border-t border-line py-5">
                      <SkeletonLine className="h-5 w-[min(24rem,80%)]" />
                    </div>
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
