import type { Metadata } from "next";
import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Mass Fitness — India's online fitness platform founded by Siddhant Sawan. Coach Monty Abraham brings 8+ years of experience and 2,500+ transformations to guide your fitness journey from home.",
  openGraph: {
    title: "About Mass Fitness",
    description:
      "Founded on real experience and a passion for transformation. Meet the team behind India's online fitness platform.",
  },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-3xl px-5 pb-20 sm:px-8 sm:pb-28">
        <HeaderSpacer />

        {/* Hero */}
        <section>
          <div>
            <p className="label mb-6 text-faint">Our Story</p>
            <h1 className="display mb-7 text-5xl text-ink sm:text-6xl lg:text-7xl">
              About Mass Fitness
            </h1>
            <p className="text-lg text-muted leading-relaxed max-w-xl">
              Empowering every individual to achieve peak health through strength training, endurance building, and balanced nutrition — fostering a supportive community dedicated to sustainable progress.
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="mt-20 border-t border-line pt-16">
          <h2 className="display mb-7 text-3xl text-ink sm:text-4xl">Why we built this</h2>
          <div className="space-y-4 text-[15px] text-muted leading-relaxed">
            <p>
              We spent hours in gyms, experimenting with workouts, tracking progress, and learning the hard way what works — and what doesn&rsquo;t. Every drop of sweat, every early morning, and every challenge taught us more than just fitness; it taught us discipline, perseverance, and the joy of transformation.
            </p>
            <p>
              But we realised something: while fitness can change your life, the journey is often confusing, lonely, or overwhelming. Not everyone has guidance, motivation, or a clear path.
            </p>
            <p>
              That&rsquo;s when the idea of Mass Fitness was born. It isn&rsquo;t just a platform — it&rsquo;s the result of our journey. It&rsquo;s where experience meets knowledge, passion meets support, and goals turn into achievements.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-line">
            <h3 className="label mb-6 text-faint">Our mission</h3>
            <p className="text-[15px] text-muted leading-relaxed mb-6">
              Mass Fitness empowers every individual to achieve peak health through strength training, endurance building, and balanced nutrition — fostering a supportive community dedicated to sustainable progress and overall well-being.
            </p>
            <ul className="space-y-2.5">
              {[
                "Personalised workout & diet plans",
                "Live coach-led online classes",
                "Real-time form feedback & monitoring",
                "Community accountability & support",
                "Train from anywhere — no gym required",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-muted leading-relaxed">
                  <span className="shrink-0 text-faint" aria-hidden="true">&mdash;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Trainer */}
        <section className="mt-20 border-t border-line pt-16">
          <h2 className="display mb-8 text-3xl text-ink sm:text-4xl">Meet your trainer</h2>
          <div className="flex items-baseline gap-4 mb-2">
            <h3 className="display text-3xl text-ink sm:text-4xl">Monty Abraham</h3>
          </div>
          <p className="label mb-6 text-faint">&ldquo;Monty Bhaiya&rdquo; — Head Coach</p>
          <p className="text-[15px] text-muted leading-relaxed mb-6">
            With over 8 years of professional fitness training experience, Monty has dedicated his career to helping people transform their health and lifestyle. His approach combines proven workout methods, personalised diet guidance, and motivational coaching that ensures real, lasting results.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {[
              "8+ years of hands-on fitness training",
              "2,500+ clients transformed",
              "Expert in strength, weight management & endurance",
              "Personalised gym & home workout programmes",
              "Builds discipline, motivation & sustainable habits",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-sm text-muted leading-relaxed">
                <span className="shrink-0 text-faint" aria-hidden="true">&mdash;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Contact CTA */}
        <section className="mt-20 border-t border-line pt-16">
          <h2 className="display mb-4 text-3xl text-ink sm:text-4xl">Ready to transform?</h2>
          <p className="text-muted mb-8 max-w-md">Join the Mass Fitness family today and start your journey to a healthier, stronger you.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://wa.me/916207524549"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-solid"
            >
              WhatsApp Us
            </a>
            <a
              href="mailto:fitnessbymass@gmail.com"
              className="btn btn-outline"
            >
              Send Email
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
