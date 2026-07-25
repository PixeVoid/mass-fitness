"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import HeroCanvas from "./HeroCanvas";
import { Phone } from "./cards/CardFrame";
import {
  FitnessJourneyCopy,
  FitnessJourneyBadges,
  FitnessJourneyScreen,
  fitnessJourneyMeta,
} from "./cards/FitnessJourneyCard";
import {
  TailoredExercisesCopy,
  TailoredExercisesBadges,
  TailoredExercisesScreen,
  tailoredExercisesMeta,
} from "./cards/TailoredExercisesCard";
import {
  TopCoachesCopy,
  TopCoachesBadges,
  TopCoachesScreen,
  topCoachesMeta,
} from "./cards/TopCoachesCard";
import {
  CustomizedWorkoutsCopy,
  CustomizedWorkoutsBadges,
  CustomizedWorkoutsScreen,
  customizedWorkoutsMeta,
} from "./cards/CustomizedWorkoutsCard";
import EndlessWorkoutsCard from "./cards/EndlessWorkoutsCard";
import CursorBlob from "./CursorBlob";
import { scrollToFeatureCard, scrollToFeatureSlug } from "@/lib/featureScroll";

const CARDS = [
  "Overview",
  "Your plan",
  "Live classes",
  "Coaches",
  "Progress",
  "Library",
];

type Stage = {
  meta: { eyebrow: string; index: number; visualLabel: string };
  Copy: () => React.JSX.Element;
  Badges: () => React.JSX.Element;
  Screen: () => React.JSX.Element;
  opacity: MotionValue<number>;
  shift: MotionValue<number>;
};

export default function StackScrollContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (latest < 0.1) setActiveCardIndex(0);
      else if (latest < 0.3) setActiveCardIndex(1);
      else if (latest < 0.5) setActiveCardIndex(2);
      else if (latest < 0.7) setActiveCardIndex(3);
      else if (latest < 0.88) setActiveCardIndex(4);
      else setActiveCardIndex(5);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Landing on this page from elsewhere (e.g. a footer link on a legal page)
  // arrives as a plain "/#slug" navigation — there's no real element at that
  // id to scroll to, so once the stack has laid out we resolve the hash the
  // same way an in-page click would.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const frame = requestAnimationFrame(() => scrollToFeatureSlug(hash));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Card 0 recedes rather than simply fading — it reads as being pushed back
  // into the stack by the card arriving over it.
  const heroOpacity = useTransform(scrollYProgress, [0, 0.1, 0.15], [1, 0.5, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.94]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], ["0%", "-8%"]);

  // Stages 1-4 no longer slide as separate full-bleed cards — one phone and
  // one copy column stay mounted for the whole middle stretch of the scroll,
  // and each stage's copy/screen/badges simply cross-fades in and out at its
  // own window. A small vertical drift rides along with the fade (content
  // arrives from a few px below, leaves a few px above) so two stages
  // mid-crossfade are offset rather than sitting in the exact same spot —
  // pure opacity blending of two full text blocks read as an illegible
  // double-exposure during the overlap.
  const STAGE_WINDOWS: [number, number, number, number][] = [
    [0.05, 0.1, 0.26, 0.3],
    [0.26, 0.3, 0.46, 0.5],
    [0.46, 0.5, 0.66, 0.7],
    [0.66, 0.7, 0.85, 0.9],
  ];
  const card1Opacity = useTransform(scrollYProgress, STAGE_WINDOWS[0], [0, 1, 1, 0]);
  const card2Opacity = useTransform(scrollYProgress, STAGE_WINDOWS[1], [0, 1, 1, 0]);
  const card3Opacity = useTransform(scrollYProgress, STAGE_WINDOWS[2], [0, 1, 1, 0]);
  const card4Opacity = useTransform(scrollYProgress, STAGE_WINDOWS[3], [0, 1, 1, 0]);

  const card1Shift = useTransform(scrollYProgress, STAGE_WINDOWS[0], [14, 0, 0, -14]);
  const card2Shift = useTransform(scrollYProgress, STAGE_WINDOWS[1], [14, 0, 0, -14]);
  const card3Shift = useTransform(scrollYProgress, STAGE_WINDOWS[2], [14, 0, 0, -14]);
  const card4Shift = useTransform(scrollYProgress, STAGE_WINDOWS[3], [14, 0, 0, -14]);

  // The persistent stage itself fades in as the hero recedes and fades out
  // right as the Library card slides up to cover it.
  const stageOpacity = useTransform(scrollYProgress, [0.03, 0.1, 0.85, 0.92], [0, 1, 1, 0]);

  // The last card inverts the page and must stay fully opaque so it covers
  // everything beneath it — hence no opacity track, only the slide.
  const card5Y = useTransform(scrollYProgress, [0.82, 0.93], ["100%", "0%"]);

  const cardShell =
    "absolute inset-0 overflow-hidden bg-surface px-4 pb-12 pt-20 sm:px-8 sm:pb-16 sm:pt-24 lg:px-12";

  const stages: Stage[] = [
    { meta: fitnessJourneyMeta, Copy: FitnessJourneyCopy, Badges: FitnessJourneyBadges, Screen: FitnessJourneyScreen, opacity: card1Opacity, shift: card1Shift },
    { meta: tailoredExercisesMeta, Copy: TailoredExercisesCopy, Badges: TailoredExercisesBadges, Screen: TailoredExercisesScreen, opacity: card2Opacity, shift: card2Shift },
    { meta: topCoachesMeta, Copy: TopCoachesCopy, Badges: TopCoachesBadges, Screen: TopCoachesScreen, opacity: card3Opacity, shift: card3Shift },
    { meta: customizedWorkoutsMeta, Copy: CustomizedWorkoutsCopy, Badges: CustomizedWorkoutsBadges, Screen: CustomizedWorkoutsScreen, opacity: card4Opacity, shift: card4Shift },
  ];

  return (
    <div ref={containerRef} id="features-stack" className="relative h-[520vh] w-full">
      <div className="sticky top-2 flex h-[calc(100vh-1rem)] w-full flex-col overflow-hidden rounded-[28px] border border-line bg-paper sm:top-3 sm:h-[calc(100vh-1.5rem)] sm:rounded-[36px]">
        <CursorBlob />

        <div className="relative h-full w-full flex-1 overflow-hidden">
          {/* Card 0 — hero */}
          <motion.div
            style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
            className="absolute inset-0 z-10 flex flex-col justify-center bg-paper px-6 pb-14 pt-24 sm:px-10 md:px-14 lg:px-16"
          >
            <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="flex flex-col items-start lg:col-span-6">
                <p className="label flex items-center gap-2.5 text-faint">
                  <span className="live-dot" aria-hidden="true" />
                  Live online classes
                </p>

                <h1 className="display mt-7 text-[2.75rem] text-ink sm:text-[3.75rem] lg:text-[4.75rem]">
                  Work<span className="line-through decoration-4">out</span> from home.
                  <br />
                  Coached like <em>you&rsquo;re</em>
                  <br />
                  in the room.
                </h1>

                <p className="mt-7 max-w-md text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                  Coach-led live sessions and structured home programmes. Real
                  feedback on real form, streamed to your phone or laptop.
                </p>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <a href="#contact" className="btn btn-outline">
                    Get your AI assessment
                  </a>
                  <a href="#pricing" className="btn btn-solid">
                    Start training
                  </a>
                </div>
              </div>

              <div className="relative hidden h-[300px] w-full sm:h-[400px] lg:col-span-6 lg:block lg:h-[520px]">
                <HeroCanvas />
              </div>
            </div>
          </motion.div>

          {/* Cards 1-4 — one persistent phone console; the copy, the badges,
              and the phone's own screen all cross-fade between stages
              instead of the whole card sliding. */}
          <motion.div style={{ opacity: stageOpacity }} className={`${cardShell} z-20`}>
            <div className="relative flex h-full w-full flex-col p-2 sm:p-4 lg:p-6">
              <div className="flex w-full items-center justify-between">
                <div className="grid">
                  {stages.map((s) => (
                    <motion.span
                      key={s.meta.eyebrow}
                      style={{ opacity: s.opacity, y: s.shift }}
                      className="label flex items-center gap-2.5 text-faint [grid-area:1/1]"
                    >
                      <span className="live-dot" aria-hidden="true" />
                      {s.meta.eyebrow}
                    </motion.span>
                  ))}
                </div>
                <div className="grid">
                  {stages.map((s) => (
                    <motion.span
                      key={s.meta.eyebrow}
                      style={{ opacity: s.opacity, y: s.shift }}
                      className="label numeric text-faint [grid-area:1/1]"
                    >
                      {String(s.meta.index).padStart(2, "0")} / 05
                    </motion.span>
                  ))}
                </div>
              </div>

              <div className="my-auto grid grid-cols-1 items-center gap-10 py-6 lg:grid-cols-12 lg:gap-12">
                <div className="grid lg:col-span-5">
                  {stages.map((s) => (
                    <motion.div
                      key={s.meta.eyebrow}
                      style={{ opacity: s.opacity, y: s.shift }}
                      className="flex w-full flex-col items-start [grid-area:1/1]"
                    >
                      <s.Copy />
                    </motion.div>
                  ))}
                </div>

                <div className="relative flex flex-col items-center gap-5 lg:col-span-7">
                  <div className="relative flex w-full items-center justify-center">
                    {stages.map((s) => (
                      <motion.div key={s.meta.eyebrow} style={{ opacity: s.opacity }}>
                        <s.Badges />
                      </motion.div>
                    ))}

                    <Phone>
                      {stages.map((s) => (
                        <motion.div
                          key={s.meta.eyebrow}
                          style={{ opacity: s.opacity, y: s.shift }}
                          className="flex h-full w-full flex-col px-4 pb-4 pt-4 [grid-area:1/1]"
                        >
                          <s.Screen />
                        </motion.div>
                      ))}
                    </Phone>
                  </div>

                  <div className="grid">
                    {stages.map((s) => (
                      <motion.p
                        key={s.meta.eyebrow}
                        style={{ opacity: s.opacity, y: s.shift }}
                        className="label text-center text-faint [grid-area:1/1]"
                      >
                        {s.meta.visualLabel}
                      </motion.p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Same surface as the rest of the stack. This card used to invert
              the palette, which made it look mis-themed rather than emphatic —
              in dark mode it flashed light, and vice versa. It still needs to
              be fully opaque (no opacity track) so it covers the cards below. */}
          <motion.div
            style={{ y: card5Y }}
            className={`${cardShell} z-60 h-full w-full`}
          >
            <EndlessWorkoutsCard />
          </motion.div>
        </div>

        {/* Pagination */}
        <div className="absolute bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-paper/80 p-1.5 backdrop-blur-xl sm:bottom-6">
          {CARDS.map((label, idx) => {
            const isActive = activeCardIndex === idx;
            return (
              <button
                key={label}
                type="button"
                onClick={() => scrollToFeatureCard(idx)}
                aria-label={`Go to ${label}`}
                aria-current={isActive ? "true" : undefined}
                className="group relative flex items-center justify-center p-1.5"
              >
                <span
                  className={`h-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive
                      ? "w-7 bg-ink"
                      : "w-1.5 bg-line-strong group-hover:bg-muted"
                  }`}
                />
                <span className="label pointer-events-none absolute bottom-full left-1/2 mb-3 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-inverse-bg px-3 py-1.5 text-[10px] text-inverse-fg group-hover:block">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
