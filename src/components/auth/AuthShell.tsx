import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Single-column frame for the auth and onboarding screens.
 *
 * These pages deliberately drop the marketing nav: once someone is entering an
 * OTP, a header full of anchor links back to the pricing section is just an
 * exit. The wordmark stays as the way back out.
 */
export default function AuthShell({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-16 sm:px-8 sm:py-24">
      <Link
        href="/"
        className="display-sm text-lg text-ink transition-opacity hover:opacity-70"
      >
        Mass Fitness
      </Link>

      <div className="mt-12 sm:mt-16">
        <p className="label text-faint">{eyebrow}</p>
        <h1 className="display mt-5 text-[2.25rem] text-ink sm:text-[2.75rem]">
          {title}
        </h1>
        {intro && (
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
            {intro}
          </p>
        )}
      </div>

      <div className="mt-10">{children}</div>

      {footer && (
        <div className="mt-10 border-t border-line pt-6 text-[0.8125rem] leading-relaxed text-faint">
          {footer}
        </div>
      )}
    </main>
  );
}
