import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/LandingPage";

export const metadata: Metadata = {
  title: "Home Workout Plans — Structured Training Without a Gym",
  description:
    "Structured home workout plans built around your goal, your schedule and the space you have. Progressive week over week, with a coach adjusting as you go. No equipment required.",
  alternates: { canonical: "/home-workout-plans" },
  openGraph: {
    title: "Home Workout Plans — Mass Fitness",
    description:
      "A programme that progresses, not a list of exercises. Built around your goal, your schedule and the space you actually have.",
    url: "/home-workout-plans",
  },
};

export const dynamic = "force-dynamic";

export default function HomeWorkoutPlansPage() {
  return (
    <SeoLandingPage
      eyebrow="Home programmes"
      title={
        <>
          A home workout plan that <em>goes somewhere.</em>
        </>
      }
      intro="A list of exercises is not a plan. A plan says what you do this week, what changes next week, and what the change is for. That difference is most of why home training stalls after a month — the sessions stayed the same, so the body did too."
      sections={[
        {
          heading: "Progression is the whole product",
          body: [
            "Load, volume and complexity step up week over week on a schedule. That is what periodisation means, and it is the part free workout lists cannot give you — they have no idea what you did last week.",
            "In practice: you might start at bodyweight squats for three sets of eight, and six weeks later be at tempo squats for four sets of ten with a pause at the bottom. Same movement, meaningfully harder, arrived at in steps small enough that each one felt doable.",
            "Your coach adjusts the plan when your life moves. A bad week, a work trip, a tweaked shoulder — the programme bends rather than breaking, which is the other reason home plans usually die.",
          ],
        },
        {
          heading: "Built around three things you tell us",
          body: [
            "The plan starts from a short assessment, not from a template with your name pasted on top.",
          ],
          points: [
            "Your goal — strength, fat loss, mobility, general conditioning, or returning from a break. These need genuinely different programmes, not the same one at different speeds",
            "Your schedule — how many days a week you can realistically train, and how long each session can be. A four-day plan you do twice is worse than a two-day plan you do twice",
            "Your space and kit — what you actually own, and what will fit. Every session has a no-equipment version",
          ],
        },
        {
          heading: "Where the diet plan fits",
          body: [
            "Every membership includes a personalised diet plan, built around food you already eat rather than an imported template of chicken and broccoli. Indian household cooking is not an obstacle to a good diet and should not be treated as one.",
            "It is guidance on structure and quantity, not a prescription. It is not medical or clinical nutrition advice, and if you have a condition that affects what you eat, that is a conversation for your doctor first.",
          ],
        },
        {
          heading: "The plan and the classes work together",
          body: [
            "The home plan is what you do on your own. The live classes are where a coach watches you do it, corrects your setup, and adjusts what comes next based on what they saw.",
            "You can lean on either. Some members do most of their work solo and join one class a week as a check-in; others treat the classes as the training and the plan as the filler. Both work. What does not work is a plan nobody ever reviews, which is why the two are sold together rather than separately.",
          ],
        },
      ]}
      closing="Tell us your goal and we'll build the plan around it — then coach you through it."
    />
  );
}
