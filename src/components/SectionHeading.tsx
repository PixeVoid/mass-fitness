import type { CSSProperties, ReactNode } from "react";

type SectionHeadingProps = {
  label: string;
  title: ReactNode;
  body?: string;
};

/**
 * The single heading treatment every section shares: a mono label, a serif
 * title, and optional supporting copy set in a narrow measure beside it.
 */
export default function SectionHeading({
  label,
  title,
  body,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
      <div className="max-w-2xl">
        <p data-reveal="" className="label text-faint">
          {label}
        </p>
        <h2
          data-reveal=""
          style={{ "--reveal-delay": "80ms" } as CSSProperties}
          className="display mt-6 text-[2.25rem] text-ink sm:text-[3rem] lg:text-[3.5rem]"
        >
          {title}
        </h2>
      </div>

      {body && (
        <p
          data-reveal=""
          style={{ "--reveal-delay": "140ms" } as CSSProperties}
          className="max-w-xs text-[0.9375rem] leading-relaxed text-muted lg:pb-3"
        >
          {body}
        </p>
      )}
    </div>
  );
}
