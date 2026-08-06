import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import {
  SkeletonLabel,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

/** Matches a post: title, meta, cover, then paragraphs. */
export default function PostLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[720px] px-5 pb-24 sm:px-8 sm:pb-32">
        <HeaderSpacer />
        <SkeletonScreen label="Loading the post…">
          <SkeletonLabel className="w-24" />
          <SkeletonLine className="mt-10 h-11 w-[min(30rem,90%)]" />
          <SkeletonLine className="mt-4 h-11 w-[min(20rem,60%)]" />
          <SkeletonLabel className="mt-6 w-44" />
          <div className="skeleton mt-12 h-64 w-full rounded-2xl" />
          <div className="mt-16 flex flex-col gap-4" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((line) => (
              <SkeletonLine
                key={line}
                className={`h-4 ${line % 3 === 2 ? "w-[60%]" : "w-full"}`}
              />
            ))}
          </div>
        </SkeletonScreen>
      </main>
    </>
  );
}
