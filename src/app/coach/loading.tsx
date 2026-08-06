import {
  SkeletonHeading,
  SkeletonLabel,
  SkeletonLine,
  SkeletonRows,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

/** Matches /coach: title, the schedule form panel, then the class list. */
export default function CoachLoading() {
  return (
    <SkeletonScreen label="Loading your schedule…">
      <SkeletonHeading />

      <div className="panel mt-10 grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 sm:p-8">
        {[0, 1, 2, 3].map((field) => (
          <div key={field}>
            <SkeletonLabel className="w-20" />
            <SkeletonLine className="mt-2.5 h-11 w-full" />
          </div>
        ))}
      </div>

      <div className="mt-16">
        <SkeletonLabel className="w-28" />
        <SkeletonRows rows={3} />
      </div>
    </SkeletonScreen>
  );
}
