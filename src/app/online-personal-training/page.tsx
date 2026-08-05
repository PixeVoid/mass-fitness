import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/LandingPage";

export const metadata: Metadata = {
  title: "Online Personal Training in India — One-to-One Coaching",
  description:
    "One-to-one online personal training from home. The whole session is yours, with a coach watching your form live, a programme built for you, and direct access between sessions.",
  alternates: { canonical: "/online-personal-training" },
  openGraph: {
    title: "Online Personal Training — Mass Fitness",
    description:
      "One-to-one coaching over live video. The whole session is yours, and the programme is built for one person.",
    url: "/online-personal-training",
  },
};

export const dynamic = "force-dynamic";

export default function OnlinePersonalTrainingPage() {
  return (
    <SeoLandingPage
      eyebrow="One-to-one"
      title={
        <>
          Online personal training, where the whole hour is <em>yours.</em>
        </>
      }
      intro="A group class gives you a coach's attention in slices. One-to-one gives you all of it — the session is built for your body on the day, and changed mid-set if what they are watching says it should be."
      sections={[
        {
          heading: "What one-to-one changes",
          body: [
            "In a group session a coach corrects what they catch. In a one-to-one they are watching only you, which means the corrections come on the rep rather than after the set, and the session can change direction the moment something is not working.",
            "It also means the programme can be genuinely specific. Working around a shoulder that does not like overhead pressing, training around night shifts, or building back after a long break are all things a group programme can only accommodate in general terms.",
            "Between sessions you have direct access to your coach — for a question about a movement, a swap because the gym you travelled to has different kit, or a check on whether something you felt is worth worrying about.",
          ],
        },
        {
          heading: "Who should pay for it, and who should not",
          body: [
            "Worth it if you are working around an injury or a medical constraint, coming back after years off and want someone certain your setup is safe, training for a specific deadline, or if you have tried group formats and found the pace never fit.",
            "Not worth it — and we would rather say so — if you are a healthy beginner with no constraints who mainly needs somebody to expect you at 7am. That is what the group sessions do, at half the price, and the coaching in them is not a lesser grade. Start there and move up if you find you need it.",
          ],
        },
        {
          heading: "How it runs",
          body: [
            "Same technology as the group classes: a link in your browser, on a phone or laptop, with nothing to install. You prop the camera where your coach can see you side-on.",
            "Session times are agreed with your coach rather than picked off a public schedule, which is most of the point — a one-to-one that has to fit a fixed timetable is a group class with fewer people in it.",
            "Your camera goes on for these, for the obvious reason. Your coach cannot correct what they cannot see. It still starts off and you still turn it on yourself.",
          ],
        },
        {
          heading: "Personal training without the commute",
          body: [
            "The usual objection to online personal training is that a trainer needs to be physically there to correct you. In practice a coach watching a clean side-on camera angle sees your hip hinge more clearly than one standing next to you at the wrong angle in a busy gym.",
            "What is genuinely lost is hands-on cueing and spotting a heavy lift. If your training depends on either, an in-person trainer is the honest answer. For everything else, what you gain is the forty minutes a day you were spending in traffic — which for most people is the difference between training three times a week and training once.",
          ],
        },
      ]}
      closing="If you want a coach whose attention is not divided, this is the one to pick."
    />
  );
}
