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
import {
  scrollToFeatureCard,
  scrollToFeatureSlug,
  stageIndexForProgress,
  STAGE_RANGES,
  STAGE_TRANSITION_HALF,
} from "@/lib/featureScroll";

const CARDS = [
  "Overview",
  "Your plan",
  "Live classes",
  "Coaches",
  "Progress",
  "Library",
];

type StageMotion = {
  opacity: MotionValue<number>;
  copyX: MotionValue<number>;
  screenX: MotionValue<string>;
  labelX: MotionValue<number>;
  scale: MotionValue<number>;
  interactive: MotionValue<"auto" | "none">;
};

/**
 * Drives one stage of the console.
 *
 * Every stage lives in the same place on screen and is only ever moved
 * sideways: it slides in from the right, sits dead still for its hold, then
 * leaves to the left.
 *
 * The two tracks deliberately use different windows. Opacity is contained
 * entirely within the stage's own slice, so a stage has reached zero by the
 * moment its successor starts to appear and two blocks of copy are never
 * legible at once — cross-fading them through each other (the previous
 * approach) blended two headlines into an unreadable double-exposure. The
 * transform runs on a wider window that spills a half-band past each edge,
 * so the slide is already in motion as the fade begins and still carries
 * through after it ends. The result reads as one thing leaving and another
 * arriving, rather than a dissolve.
 */
function useStageMotion(
  progress: MotionValue<number>,
  range: readonly [number, number],
): StageMotion {
  const [start, end] = range;
  const h = STAGE_TRANSITION_HALF;
  const fade = [start, start + h, end - h, end];
  const move = [start - h, start + h, end - h, end + h];

  const opacity = useTransform(progress, fade, [0, 1, 1, 0]);

  return {
    opacity,
    copyX: useTransform(progress, move, [120, 0, 0, -120]),
    // The phone's screen swipes the full width of the bezel, which clips it —
    // the same motion a real app transition has.
    screenX: useTransform(progress, move, ["70%", "0%", "0%", "-70%"]),
    labelX: useTransform(progress, move, [40, 0, 0, -40]),
    scale: useTransform(progress, move, [0.96, 1, 1, 0.96]),
    // Every stage stays mounted at inset-0 for the whole stack, so without
    // this the topmost one in DOM order swallows clicks meant for the stage
    // actually on screen — and for the hero underneath it.
    interactive: useTransform(opacity, (v) => (v > 0.6 ? "auto" : "none")),
  };
}

export default function StackScrollContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      setActiveCardIndex(stageIndexForProgress(latest));
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

  const [heroStart, heroEnd] = STAGE_RANGES[0];
  const libraryStart = STAGE_RANGES[5][0];

  // The hero recedes rather than sliding — it reads as being pushed back into
  // the stack by the console arriving over it.
  const heroOpacity = useTransform(
    scrollYProgress,
    [heroStart, heroEnd * 0.45, heroEnd],
    [1, 0.6, 0],
  );
  const heroScale = useTransform(scrollYProgress, [heroStart, heroEnd], [1, 0.94]);
  const heroY = useTransform(scrollYProgress, [heroStart, heroEnd], ["0%", "-8%"]);
  const heroInteractive = useTransform(heroOpacity, (v) =>
    v > 0.6 ? "auto" : "none",
  );

  const stage1 = useStageMotion(scrollYProgress, STAGE_RANGES[1]);
  const stage2 = useStageMotion(scrollYProgress, STAGE_RANGES[2]);
  const stage3 = useStageMotion(scrollYProgress, STAGE_RANGES[3]);
  const stage4 = useStageMotion(scrollYProgress, STAGE_RANGES[4]);

  // The console shell fades in behind the hero as it recedes, then simply
  // stays — the library card is opaque and sits above it, so there is nothing
  // to fade out for. Its pointer-events still have to follow the fade, or the
  // shell would sit invisibly over the hero and eat the hero's buttons.
  const consoleOpacity = useTransform(
    scrollYProgress,
    [heroEnd - 0.04, heroEnd - 0.005, 1],
    [0, 1, 1],
  );
  const consoleInteractive = useTransform(consoleOpacity, (v) =>
    v > 0.5 ? "auto" : "none",
  );

  // The last card must stay fully opaque so it covers everything beneath it —
  // hence no opacity track, only the slide.
  const libraryY = useTransform(
    scrollYProgress,
    [libraryStart, libraryStart + 0.1],
    ["100%", "0%"],
  );

  const cardShell =
    "absolute inset-0 overflow-hidden bg-surface px-4 pb-12 pt-20 sm:px-8 sm:pb-16 sm:pt-24 lg:px-12";

  const stages = [
    { meta: fitnessJourneyMeta, Copy: FitnessJourneyCopy, Badges: FitnessJourneyBadges, Screen: FitnessJourneyScreen, m: stage1 },
    { meta: tailoredExercisesMeta, Copy: TailoredExercisesCopy, Badges: TailoredExercisesBadges, Screen: TailoredExercisesScreen, m: stage2 },
    { meta: topCoachesMeta, Copy: TopCoachesCopy, Badges: TopCoachesBadges, Screen: TopCoachesScreen, m: stage3 },
    { meta: customizedWorkoutsMeta, Copy: CustomizedWorkoutsCopy, Badges: CustomizedWorkoutsBadges, Screen: CustomizedWorkoutsScreen, m: stage4 },
  ];

  return (
    <div ref={containerRef} id="features-stack" className="relative h-[520vh] w-full">
      <div className="sticky top-2 flex h-[calc(100vh-1rem)] w-full flex-col overflow-hidden rounded-[28px] border border-line bg-paper sm:top-3 sm:h-[calc(100vh-1.5rem)] sm:rounded-[36px]">
        <CursorBlob />

        <div className="relative h-full w-full flex-1 overflow-hidden">
          {/* Stage 0 — hero */}
          <motion.div
            style={{
              opacity: heroOpacity,
              scale: heroScale,
              y: heroY,
              pointerEvents: heroInteractive,
            }}
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

          {/* Stages 1-4 — one persistent console. The phone shell and the
              layout never move; only the copy, the badges and the phone's
              screen slide through it. */}
          <motion.div
            style={{ opacity: consoleOpacity, pointerEvents: consoleInteractive }}
            className={`${cardShell} z-20`}
          >
            <div className="relative flex h-full w-full flex-col p-2 sm:p-4 lg:p-6">
              <div className="flex w-full items-center justify-between overflow-hidden">
                <div className="grid">
                  {stages.map((s) => (
                    <motion.span
                      key={s.meta.eyebrow}
                      style={{ opacity: s.m.opacity, x: s.m.labelX }}
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
                      style={{ opacity: s.m.opacity, x: s.m.labelX }}
                      className="label numeric text-faint [grid-area:1/1]"
                    >
                      {String(s.meta.index).padStart(2, "0")} / 05
                    </motion.span>
                  ))}
                </div>
              </div>

              <div className="my-auto grid grid-cols-1 items-center gap-10 py-6 lg:grid-cols-12 lg:gap-12">
                <div className="grid overflow-hidden lg:col-span-5">
                  {stages.map((s) => (
                    <motion.div
                      key={s.meta.eyebrow}
                      style={{
                        opacity: s.m.opacity,
                        x: s.m.copyX,
                        scale: s.m.scale,
                        pointerEvents: s.m.interactive,
                      }}
                      className="flex w-full flex-col items-start [grid-area:1/1]"
                    >
                      <s.Copy />
                    </motion.div>
                  ))}
                </div>

                <div className="relative flex flex-col items-center gap-5 lg:col-span-7">
                  <div className="relative flex w-full items-center justify-center">
                    {/* Decorative floaters — never interactive, so they can
                        never sit over the copy and eat its clicks. */}
                    {stages.map((s) => (
                      <motion.div
                        key={s.meta.eyebrow}
                        style={{ opacity: s.m.opacity, scale: s.m.scale }}
                        className="pointer-events-none"
                      >
                        <s.Badges />
                      </motion.div>
                    ))}

                    <Phone>
                      {stages.map((s) => (
                        <motion.div
                          key={s.meta.eyebrow}
                          style={{ opacity: s.m.opacity, x: s.m.screenX }}
                          className="flex h-full w-full flex-col px-4 pb-4 pt-4 [grid-area:1/1]"
                        >
                          <s.Screen />
                        </motion.div>
                      ))}
                    </Phone>
                  </div>

                  <div className="grid overflow-hidden">
                    {stages.map((s) => (
                      <motion.p
                        key={s.meta.eyebrow}
                        style={{ opacity: s.m.opacity, x: s.m.labelX }}
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
            style={{ y: libraryY }}
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
