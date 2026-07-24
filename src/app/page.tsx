import type { CSSProperties } from "react";
import ClassGrid from "@/components/ClassGrid";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import SectionHeading from "@/components/SectionHeading";
import StackScrollContainer from "@/components/StackScrollContainer";
import StatRow from "@/components/StatRow";
import { StructuredData } from "@/components/StructuredData";

const STEPS = [
  {
    title: "Set your goal",
    body: "Tell us what you're training for — strength, fat loss, mobility, or general conditioning. We benchmark where you're starting from.",
  },
  {
    title: "Get matched",
    body: "We slot you into live sessions and a home plan that fit your goal, your schedule, and the space you actually have.",
  },
  {
    title: "Train and adjust",
    body: "Join from laptop or phone. Your coach corrects your setup, and the programme moves as you do.",
  },
];

const PLANS = [
  {
    name: "Group",
    price: "₹1,499",
    cadence: "per month",
    summary: "Coached sessions with a room of people going through the same thing.",
    perks: [
      "Personalised diet plan",
      "Home workout support",
      "Group live sessions",
      "Flexible timings",
    ],
    featured: false,
  },
  {
    name: "One-to-one",
    price: "₹2,999",
    cadence: "per month",
    summary: "The whole session is yours. Best if you're working around an injury or a deadline.",
    perks: [
      "Personalised diet plan",
      "Progress tracking & monitoring",
      "Gym + home programme",
      "Direct trainer access",
    ],
    featured: true,
  },
  {
    name: "Squad",
    price: "₹1,199",
    cadence: "per person / month",
    summary: "Train with a partner. Cheaper than one-to-one, and far harder to skip.",
    perks: [
      "Minimum two people",
      "Discounted coaching",
      "Shared accountability",
      "Community sessions",
    ],
    featured: false,
  },
];

export default function Home() {
  return (
    <>
      <StructuredData />
      <Nav />

      <main id="top" className="px-2.5 pt-2 sm:px-4 sm:pt-3 lg:px-5">
        {/* Hero + five feature cards, stacked on scroll */}
        <section id="features">
          <StackScrollContainer />
        </section>

        <StatRow />

        {/* CLASSES */}
        <section
          id="classes"
          className="mx-auto w-full max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12"
        >
          <SectionHeading
            label="The schedule"
            title={
              <>
                Four tracks. Every one <em>progressive.</em>
              </>
            }
            body="Load, volume and complexity step up week over week. Pick the stimulus — we handle the periodisation."
          />
          <ClassGrid />
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12"
        >
          <SectionHeading label="Getting started" title="Three steps to your first class." />

          <ol className="mt-16 grid grid-cols-1 gap-x-8 sm:mt-20 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                data-reveal=""
                style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
                className="border-t border-line pt-8 sm:pt-10"
              >
                <span className="label numeric text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="display-sm mt-6 text-[1.5rem] text-ink sm:text-[1.75rem]">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-xs text-[0.9375rem] leading-relaxed text-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* PRICING */}
        <section
          id="pricing"
          className="mx-auto w-full max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12"
        >
          <SectionHeading
            label="Membership"
            title="One membership. Pick your commitment."
            body="No lock-in, no joining fee. Switch or cancel at the end of any month."
          />

          <div className="mt-16 grid grid-cols-1 gap-px border-t border-line bg-line sm:mt-20 lg:grid-cols-3">
            {PLANS.map((plan, index) => (
              <div
                key={plan.name}
                data-reveal=""
                style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
                className={`flex flex-col p-8 sm:p-10 ${
                  plan.featured ? "bg-surface" : "bg-paper"
                }`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="display-sm text-[1.75rem] text-ink">{plan.name}</h3>
                  {plan.featured && (
                    <span className="label text-faint">Most chosen</span>
                  )}
                </div>

                <p className="mt-4 min-h-[3.25rem] max-w-xs text-[0.9375rem] leading-relaxed text-muted">
                  {plan.summary}
                </p>

                <div className="mt-8 flex items-baseline gap-2">
                  <span className="numeric text-4xl tracking-tight text-ink">
                    {plan.price}
                  </span>
                  <span className="label text-faint">{plan.cadence}</span>
                </div>

                <ul className="mt-8 flex flex-1 flex-col gap-3 border-t border-line pt-8">
                  {plan.perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-baseline gap-3 text-[0.9375rem] text-muted"
                    >
                      <span aria-hidden="true" className="text-faint">
                        &mdash;
                      </span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={`btn mt-10 w-full ${
                    plan.featured ? "btn-solid" : "btn-outline"
                  }`}
                >
                  Choose {plan.name.toLowerCase()}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section
          id="contact"
          className="mx-auto w-full max-w-[1400px] px-5 py-28 sm:px-8 sm:py-40 lg:px-12"
        >
          <div className="border-t border-line pt-16 sm:pt-20">
            <h2
              data-reveal=""
              className="display max-w-3xl text-[2.5rem] text-ink sm:text-[3.5rem] lg:text-[4.25rem]"
            >
              Your gym is wherever you <em>unroll a mat.</em>
            </h2>

            <p
              data-reveal=""
              style={{ "--reveal-delay": "100ms" } as CSSProperties}
              className="mt-8 max-w-md text-[0.9375rem] leading-relaxed text-muted sm:text-base"
            >
              Get matched to a live class this week. No equipment and no lock-in
              contract to start.
            </p>

            <div
              data-reveal=""
              style={{ "--reveal-delay": "180ms" } as CSSProperties}
              className="mt-10 flex flex-col gap-3 sm:flex-row"
            >
              <a
                href="https://wa.me/916207524549"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-solid"
              >
                Message us on WhatsApp
              </a>
              <a href="mailto:fitnessbymass@gmail.com" className="btn btn-outline">
                Email us
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
