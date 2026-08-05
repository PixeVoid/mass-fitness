import type { Metadata } from "next";
import SeoLandingPage from "@/components/seo/LandingPage";

export const metadata: Metadata = {
  title: "Live Online Fitness Classes in India",
  description:
    "Coach-led live online fitness classes you join from home. Real-time form correction, all levels, no equipment needed. Sessions run several times a week from ₹2,500/month.",
  alternates: { canonical: "/online-fitness-classes" },
  openGraph: {
    title: "Live Online Fitness Classes in India — Mass Fitness",
    description:
      "Coach-led live sessions you join from home, with a real coach watching your form. Not a video library.",
    url: "/online-fitness-classes",
  },
};

export const dynamic = "force-dynamic";

export default function OnlineFitnessClassesPage() {
  return (
    <SeoLandingPage
      eyebrow="Live online classes"
      title={
        <>
          Online fitness classes with a coach who can <em>actually see you.</em>
        </>
      }
      intro="Most 'online fitness' is a video library — you press play and nobody knows whether you did it, or whether you did it right. Mass Fitness classes are live sessions with a coach in the room, watching, correcting, and calling the next set."
      sections={[
        {
          heading: "What a session actually looks like",
          body: [
            "You open a link on your phone or laptop a few minutes before the start. No app to install, no account with a third party — the class runs in your browser.",
            "The coach is on screen and talking. You can turn your own camera on so they can see your setup and correct it, or leave it off and just follow along. Both start off by default; turning yours on is your choice, and it is the thing that makes the coaching worth more than a video.",
            "Sessions run 25 to 45 minutes. The coach calls the work, counts the tempo, and gives you a lighter and a harder version of every movement, so a beginner and someone three years in are doing the same session at different loads.",
          ],
        },
        {
          heading: "Why live beats recorded, and where it doesn't",
          body: [
            "Live wins on two things that decide whether people keep training: form and attendance. A recorded video cannot tell you your knees are caving or that you are rushing the eccentric. And a session at a fixed time with a person expecting you is far harder to skip than a file that will still be there tomorrow.",
            "Recorded wins on flexibility, and we will not pretend otherwise. If your schedule genuinely cannot hold a fixed slot most weeks, a library may suit you better. Classes run several times a week at different times, which covers most people — but not everyone.",
          ],
        },
        {
          heading: "What you need",
          body: [
            "Less than people expect. The classes are built for Indian flats, not for garage gyms.",
          ],
          points: [
            "Floor space roughly the size of a yoga mat, plus room to reach overhead and to the sides",
            "A phone or laptop, propped where the camera can see you from the side",
            "A stable-ish connection — the class drops to audio if your bandwidth dips, and you can rejoin if it cuts out",
            "No equipment at all. Every programme has a no-kit version; a mat and dumbbells add options but are never required",
          ],
        },
        {
          heading: "Who this is for",
          body: [
            "People who have tried training alone and stopped. That is the honest description of most of who we coach — the problem was almost never motivation, it was that nobody was watching and nothing was scheduled.",
            "It also suits anyone rebuilding after a break, working around a desk job, or training in a flat where a gym commute is the thing that kills consistency.",
            "It suits you less if you are chasing a competitive strength total or need specialist rehab. Talk to your doctor about any injury or medical condition first — our coaches are coaches, not clinicians.",
          ],
        },
      ]}
      closing="Your gym is wherever you unroll a mat. Pick a plan and we'll match you to a class this week."
    />
  );
}
