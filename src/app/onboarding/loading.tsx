import {
  SkeletonLabel,
  SkeletonLine,
  SkeletonScreen,
} from "@/components/ui/Skeleton";

/** Onboarding is a short centred form; this matches its column. */
export default function OnboardingLoading() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-5 py-16">
      <SkeletonScreen label="Loading…">
        <SkeletonLabel className="w-24" />
        <SkeletonLine className="mt-5 h-9 w-[min(20rem,85%)]" />
        <div className="mt-10 flex flex-col gap-5" aria-hidden="true">
          {[0, 1, 2].map((field) => (
            <div key={field}>
              <SkeletonLabel className="w-20" />
              <SkeletonLine className="mt-2.5 h-11 w-full" />
            </div>
          ))}
          <SkeletonLine className="mt-2 h-11 w-full rounded-full" />
        </div>
      </SkeletonScreen>
    </main>
  );
}
