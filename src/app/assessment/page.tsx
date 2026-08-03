import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import AssessmentQuiz from "@/components/assessment/AssessmentQuiz";

export const metadata: Metadata = {
  title: "Free fitness self-assessment",
  description:
    "A 2-minute fitness self-assessment — no sign-up needed. Get a score out of 100 and a plan recommendation, emailed to you as a PDF.",
};

export default function AssessmentPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href="/"
        className="flex items-center gap-2 text-ink transition-opacity hover:opacity-70"
      >
        <LogoMark className="h-5" />
        <span className="brand-mark text-lg">Mass Fitness</span>
      </Link>

      <div className="mt-10 max-w-2xl text-center sm:mt-14 sm:text-left">
        <p className="label text-faint">Free self-assessment</p>
        <h1 className="display mt-5 text-[2rem] text-ink sm:text-[2.75rem]">
          Where do you stand today?
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
          15 quick questions, a score out of 100, and a plan recommendation —
          sent to you on WhatsApp and email as a PDF.
        </p>
      </div>

      <div className="mt-10 sm:mt-12">
        <AssessmentQuiz />
      </div>

      <p className="mx-auto mt-8 max-w-xl text-center text-[0.8125rem] leading-relaxed text-faint">
        General fitness guidance only — not medical advice, and not a
        substitute for a coach. Talk to a doctor about pain, injury, or any
        medical condition.
      </p>
    </main>
  );
}
