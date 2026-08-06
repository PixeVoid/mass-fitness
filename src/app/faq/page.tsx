import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import { getPublishedFaqs, groupFaqs } from "@/lib/content";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Answers about Mass Fitness live online classes, home workouts, equipment, membership plans and payment — before you sign up.",
  alternates: { canonical: "/faq" },
};

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const faqs = await getPublishedFaqs();
  const groups = groupFaqs(faqs);

  // FAQPage markup earns the expandable answers directly in search results,
  // which for questions like "do I need equipment" is the whole point — the
  // person asking gets answered whether or not they click.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8 sm:pb-32">
        <HeaderSpacer />

        <p className="label text-faint">Questions</p>
        <h1 className="display mt-5 text-[2.5rem] text-ink sm:text-[3.25rem]">
          Everything people ask.
        </h1>
        <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
          If yours isn&rsquo;t here, message us — we&rsquo;d rather answer it
          than have you guess.
        </p>

        {groups.length === 0 ? (
          <p className="mt-20 border-t border-line pt-10 text-[0.9375rem] leading-relaxed text-muted">
            Nothing here yet.
          </p>
        ) : (
          <div className="mt-20">
            {groups.map((group) => (
              <section
                key={group.category}
                className="mt-14 border-t border-line pt-10 first:mt-0"
              >
                <h2 className="label text-faint">{group.category}</h2>

                <div className="mt-8 flex flex-col">
                  {group.items.map((faq) => (
                    // <details> rather than React state: it works before
                    // hydration, it is keyboard accessible for free, and
                    // browser find-in-page can open a closed answer.
                    <details
                      key={faq.id}
                      className="group border-b border-line py-5"
                    >
                      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 text-[1.0625rem] text-ink marker:content-['']">
                        {faq.question}
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-faint transition-transform duration-300 group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-20 flex flex-col gap-4 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.9375rem] text-muted">Still unsure?</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a
              href="https://wa.me/916207524549"
              target="_blank"
              rel="noopener noreferrer"
              className="link text-sm"
            >
              Ask on WhatsApp
            </a>
            <Link href="/assessment" className="link text-sm">
              Take the free assessment
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
