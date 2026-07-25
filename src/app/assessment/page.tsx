import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import AssessmentChat from "@/components/assessment/AssessmentChat";

export const metadata: Metadata = {
  title: "Get your AI assessment",
  description:
    "A short AI-guided fitness assessment — no sign-up needed. Answer a few questions and get matched with the right programme.",
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

      <div className="mt-10 max-w-2xl sm:mt-14">
        <p className="label text-faint">AI assessment</p>
        <h1 className="display mt-5 text-[2rem] text-ink sm:text-[2.75rem]">
          A few questions, then a plan that fits.
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
          No account needed. Tell the assistant a bit about yourself and
          leave your number if you want a coach to follow up.
        </p>
      </div>

      <div className="mt-10 sm:mt-12">
        <AssessmentChat />
      </div>
    </main>
  );
}
