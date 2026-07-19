import ClassGrid from "@/components/ClassGrid";
import CursorBlob from "@/components/CursorBlob";
import HeroCanvas from "@/components/HeroCanvas";
import Marquee from "@/components/Marquee";
import Nav from "@/components/Nav";
import { StructuredData } from "@/components/StructuredData";

const MARQUEE_ITEMS = [
  "MOBILITY",
  "HIIT",
  "REAL COACHES",
  "NO EQUIPMENT NEEDED",
  "LIVE CLASSES",
  "STRENGTH",
];

const FEATURES = [
  {
    label: "Live",
    title: "Coach-led classes, streamed to your living room",
    body: "Join scheduled sessions with a real trainer watching form in real time — not a pre-recorded video you scrub through.",
  },
  {
    label: "Structured",
    title: "Programs that progress, not random workouts",
    body: "Every plan builds week over week toward a goal you set, so effort on day 40 counts for more than effort on day 1.",
  },
  {
    label: "Flexible",
    title: "No equipment required to start",
    body: "Bodyweight-first programming with equipment add-ons if you have them — a mat and floor space is enough on day one.",
  },
];

const STEPS = [
  {
    title: "Set your goal",
    body: "Tell us what you're training for — strength, fat loss, mobility, or general conditioning.",
  },
  {
    title: "Get matched to a class",
    body: "We slot you into live sessions and a home plan that fit your goal, your schedule, and your space.",
  },
  {
    title: "Show up and train",
    body: "Join from your phone or laptop. Your coach sees your form and adjusts the session in real time.",
  },
];

type Plan = {
  name: string;
  cadence: string;
  price: string;
  perMonth: string;
  featured?: boolean;
  perks: string[];
};

const PLANS: Plan[] = [
  {
    name: "Monthly",
    cadence: "Billed every month",
    price: "₹999",
    perMonth: "₹999 / mo",
    perks: [
      "Unlimited live classes",
      "1 structured home program",
      "Chat support",
    ],
  },
  {
    name: "Quarterly",
    cadence: "Billed every 3 months",
    price: "₹2,499",
    perMonth: "₹833 / mo",
    featured: true,
    perks: [
      "Everything in Monthly",
      "Progress check-ins every 3 weeks",
      "Priority class booking",
    ],
  },
  {
    name: "Annual",
    cadence: "Billed once a year",
    price: "₹7,999",
    perMonth: "₹666 / mo",
    perks: [
      "Everything in Quarterly",
      "1:1 goal-setting call each quarter",
      "Locked-in renewal price",
    ],
  },
];

export default function Home() {
  return (
    <>
      <StructuredData />
      <div id="top" className="min-h-screen bg-shell p-2.5 sm:p-4 md:p-5 lg:p-6 flex flex-col gap-4">
        
        {/* HERO CONTAINER - Pure Light Cream Canvas (#F5F3EF) with Cutout Header Tabs */}
        <section className="relative w-full min-h-[calc(100vh-2.5rem)] md:h-[calc(100vh-2.5rem)] rounded-b-[32px] sm:rounded-b-[40px] bg-canvas overflow-hidden flex flex-col justify-between shadow-2xl">
          
          {/* Ambient Cursor Glow (User Added Component) */}
          <CursorBlob />

          {/* CUTOUT HEADER - FynSec Reference Cutout Header Tabs */}
          <Nav />

          {/* MAIN HERO CONTENT */}
          <div className="pt-24 sm:pt-28 md:pt-24 pb-8 px-6 sm:px-10 md:px-14 lg:px-16 flex-1 w-full flex flex-col-reverse md:flex-row items-center justify-between gap-8 md:gap-10 z-10 my-auto">
            
            {/* Left Content Column */}
            <div className="w-full md:w-1/2 flex flex-col items-start justify-center max-w-xl">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-ink/60 sm:text-sm">
                Live online fitness classes
              </p>
              <h1 className="font-display text-[13vw] leading-[0.92] tracking-tight text-ink sm:text-6xl md:text-7xl lg:text-8xl">
                FITNESS
                <br />
                <span className="text-accent">FROM HOME.</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-ink/70 sm:text-lg">
                Coach-led live classes and structured home workout plans —
                real feedback on real form, streamed straight to your phone
                or laptop. No commute, no equipment required to start.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row w-full sm:w-auto">
                <a
                  href="#pricing"
                  className="flex min-h-11 items-center justify-center rounded-full bg-accent px-7 py-3 text-base font-semibold text-canvas transition-colors hover:bg-accent-dim shadow-sm"
                >
                  Start training
                </a>
                <a
                  href="#how-it-works"
                  className="flex min-h-11 items-center justify-center rounded-full border border-ink/15 px-7 py-3 text-base font-medium text-ink transition-colors hover:bg-ink/5"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Right Column: Interactive 3D Canvas */}
            <div className="w-full md:w-1/2 h-[300px] sm:h-[380px] md:h-[440px] lg:h-[480px] flex items-center justify-center relative">
              <HeroCanvas />
            </div>

          </div>

        </section>

        {/* MARQUEE TICKER BAR (User Added Component) */}
        <Marquee items={MARQUEE_ITEMS} />

        {/* CLASSES / FEATURES SECTION (Integrating ClassGrid) */}
        <section id="classes" className="mx-auto max-w-6xl px-2 py-16 sm:py-20 w-full flex flex-col gap-10">
          <div>
            <h2 className="max-w-xl font-display text-3xl leading-tight text-canvas sm:text-4xl">
              Built like a training program, not a video library.
            </h2>
            <p className="mt-3 max-w-lg text-base text-canvas/70">
              Choose from high-energy live sessions or follow a structured track at your own pace.
            </p>
          </div>
          <ClassGrid />
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how-it-works"
          className="mx-auto max-w-6xl px-2 py-16 sm:py-20 w-full"
        >
          <h2 className="max-w-xl font-display text-3xl leading-tight text-canvas sm:text-4xl">
            Three steps to your first live class.
          </h2>
          <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-3xl bg-canvas p-6 sm:p-7 shadow-md">
                <span className="font-mono text-sm text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-xl text-ink sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink/70 sm:text-base">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* PRICING */}
        <section id="pricing" className="mx-auto max-w-6xl px-2 py-16 sm:py-20 w-full">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-xl font-display text-3xl leading-tight text-canvas sm:text-4xl">
              One membership. Pick your commitment.
            </h2>
            <p className="text-sm text-canvas/60">
              Prices shown are placeholders — final pricing to be confirmed.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-3xl p-6 sm:p-7 shadow-md ${
                  plan.featured
                    ? "bg-accent text-canvas ring-2 ring-accent"
                    : "bg-card text-ink"
                }`}
              >
                {plan.featured && (
                  <span className="mb-3 w-fit rounded-full bg-canvas/20 px-3 py-1 font-mono text-xs uppercase tracking-wide">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-2xl">{plan.name}</h3>
                <p
                  className={`mt-1 text-sm ${
                    plan.featured ? "text-canvas/80" : "text-ink/60"
                  }`}
                >
                  {plan.cadence}
                </p>

                <div className="mt-6 font-mono">
                  <span className="text-3xl">{plan.price}</span>
                  <span
                    className={`ml-2 text-sm ${
                      plan.featured ? "text-canvas/80" : "text-ink/60"
                    }`}
                  >
                    {plan.perMonth}
                  </span>
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="text-sm leading-relaxed flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={`mt-7 flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                    plan.featured
                      ? "bg-canvas text-ink hover:bg-canvas/90"
                      : "bg-ink text-canvas hover:bg-ink/85"
                  }`}
                >
                  Choose {plan.name}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* CTA / CONTACT */}
        <section
          id="contact"
          className="mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-canvas px-6 py-14 text-center sm:px-10 sm:py-20 shadow-xl w-full"
        >
          <h2 className="mx-auto max-w-2xl font-display text-3xl leading-tight text-ink sm:text-5xl">
            Your gym is wherever you unroll a mat.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-ink/70 sm:text-lg">
            Get matched to a live class this week — no equipment, no lock-in
            contract to start.
          </p>
          <a
            href="mailto:hello@massfitness.app"
            className="mx-auto mt-8 flex min-h-11 w-fit items-center justify-center rounded-full bg-accent px-8 py-3 text-base font-semibold text-canvas transition-colors hover:bg-accent-dim shadow-md"
          >
            Get started
          </a>
        </section>

        <footer className="mx-auto max-w-6xl px-3 py-8 text-center font-mono text-xs text-canvas/50 sm:text-sm">
          © {new Date().getFullYear()} Mass Fitness — a PixeVoid product.
        </footer>
      </div>
    </>
  );
}
