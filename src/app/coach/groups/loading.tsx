import {
  SkeletonLabel,
  SkeletonLine,
  SkeletonRows,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

/** Matches /coach/groups: title, the new-member panel, then the rosters. */
export default function CoachGroupsLoading() {
  return (
    <SkeletonScreen label="Loading your groups…">
      <SkeletonLine className="h-8 w-52" />

      <div className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <SkeletonLabel className="w-44" />
        <div className="mt-6 flex flex-col gap-5">
          {[0, 1].map((row) => (
            <div key={row}>
              <SkeletonLine className="h-5 w-[min(20rem,75%)]" />
              <SkeletonLine className="mt-2.5 h-3.5 w-40" />
            </div>
          ))}
        </div>
      </div>

      <SkeletonRows rows={3} className="mt-14" />
    </SkeletonScreen>
  );
}
