import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import {
  SkeletonHeading,
  SkeletonRows,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

/** Matches /subscribe/group: the title, then the pickable rows. */
export default function GroupPickerLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[900px] px-5 pb-20 sm:px-8 sm:pb-28">
        <HeaderSpacer />
        <SkeletonScreen label="Loading the groups…">
          <SkeletonHeading />
          <SkeletonRows rows={4} className="mt-12" />
        </SkeletonScreen>
      </main>
    </>
  );
}
