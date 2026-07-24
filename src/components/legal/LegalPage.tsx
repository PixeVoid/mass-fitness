import Link from "next/link";

export function LegalPage({
  eyebrow = "Legal",
  title,
  meta,
  children,
}: {
  eyebrow?: string;
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
      <Link href="/" className="link label mb-20 inline-flex items-center gap-2">
        <span aria-hidden="true">&larr;</span>
        Mass Fitness
      </Link>

      <p className="label text-faint">{eyebrow}</p>
      <h1 className="display mt-6 text-[2.5rem] text-ink sm:text-[3.25rem]">
        {title}
      </h1>
      <p className="label numeric mt-6 text-faint">{meta}</p>

      <div className="mt-20">{children}</div>

      <div className="mt-24 flex flex-col gap-4 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.9375rem] text-muted">
          Questions? We&rsquo;re one message away.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href="mailto:fitnessbymass@gmail.com" className="link numeric text-sm">
            fitnessbymass@gmail.com
          </a>
          <a
            href="https://wa.me/916207524549"
            target="_blank"
            rel="noopener noreferrer"
            className="link text-sm"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}

export function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 border-t border-line pt-10 first:mt-0 first:border-t-0 first:pt-0">
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-12">
        <span className="label numeric text-faint sm:col-span-2">{index}</span>
        <div className="sm:col-span-10">
          <h2 className="display-sm text-[1.5rem] text-ink">{title}</h2>
          <div className="mt-5 space-y-4 text-[0.9375rem] leading-relaxed text-muted">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 border-l border-line-strong pl-6">
      <p className="text-[0.9375rem] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-3 text-[0.9375rem] leading-relaxed text-muted"
        >
          <span className="shrink-0 text-faint" aria-hidden="true">
            &mdash;
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
