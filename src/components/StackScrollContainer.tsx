"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import HeroCanvas from "./HeroCanvas";
import FitnessJourneyCard from "./cards/FitnessJourneyCard";
import TailoredExercisesCard from "./cards/TailoredExercisesCard";
import CustomizedWorkoutsCard from "./cards/CustomizedWorkoutsCard";
import TopCoachesCard from "./cards/TopCoachesCard";
import EndlessWorkoutsCard from "./cards/EndlessWorkoutsCard";
import CursorBlob from "./CursorBlob";

const CARDS = [
  "Overview",
  "Your plan",
  "Live classes",
  "Coaches",
  "Progress",
  "Library",
];

const CARD_TARGET_PROGRESS = [0.0, 0.2, 0.4, 0.6, 0.8, 0.95];

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

  // Card 0 recedes rather than simply fading — it reads as being pushed back
  // into the stack by the card arriving over it.
  const heroOpacity = useTransform(scrollYProgress, [0, 0.1, 0.15], [1, 0.5, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.94]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], ["0%", "-8%"]);

  const card1Y = useTransform(scrollYProgress, [0.05, 0.18], ["100%", "0%"]);
  const card1Scale = useTransform(scrollYProgress, [0.22, 0.35], [1, 0.94]);
  const card1Opacity = useTransform(scrollYProgress, [0.05, 0.12, 0.28, 0.35], [0, 1, 1, 0]);

  const card2Y = useTransform(scrollYProgress, [0.25, 0.38], ["100%", "0%"]);
  const card2Scale = useTransform(scrollYProgress, [0.42, 0.55], [1, 0.94]);
  const card2Opacity = useTransform(scrollYProgress, [0.25, 0.32, 0.48, 0.55], [0, 1, 1, 0]);

  const card3Y = useTransform(scrollYProgress, [0.45, 0.58], ["100%", "0%"]);
  const card3Scale = useTransform(scrollYProgress, [0.62, 0.75], [1, 0.94]);
  const card3Opacity = useTransform(scrollYProgress, [0.45, 0.52, 0.68, 0.75], [0, 1, 1, 0]);

  const card4Y = useTransform(scrollYProgress, [0.65, 0.78], ["100%", "0%"]);
  const card4Scale = useTransform(scrollYProgress, [0.82, 0.9], [1, 0.94]);
  const card4Opacity = useTransform(scrollYProgress, [0.65, 0.72, 0.83, 0.9], [0, 1, 1, 0]);

  // The last card inverts the page and must stay fully opaque so it covers
  // everything beneath it — hence no opacity track, only the slide.
  const card5Y = useTransform(scrollYProgress, [0.82, 0.93], ["100%", "0%"]);

  const scrollToCard = (index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top + window.scrollY;
    const containerHeight = container.clientHeight - window.innerHeight;
    window.scrollTo({
      top: containerTop + containerHeight * CARD_TARGET_PROGRESS[index],
      behavior: "smooth",
    });
  };

  const cardShell =
    "absolute inset-0 overflow-hidden bg-surface px-4 pb-12 pt-20 sm:px-8 sm:pb-16 sm:pt-24 lg:px-12";

  return (
    <div ref={containerRef} className="relative h-[520vh] w-full">
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
                  Train at home.
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
                  <a href="#pricing" className="btn btn-solid">
                    Start training
                  </a>
                  <button
                    type="button"
                    onClick={() => scrollToCard(1)}
                    className="btn btn-outline"
                  >
                    Explore features
                  </button>
                </div>
              </div>

              <div className="relative hidden h-[300px] w-full sm:h-[400px] lg:col-span-6 lg:block lg:h-[520px]">
                <HeroCanvas />
              </div>
            </div>
          </motion.div>

          <motion.div
            style={{ y: card1Y, scale: card1Scale, opacity: card1Opacity }}
            className={`${cardShell} z-20`}
          >
            <FitnessJourneyCard />
          </motion.div>

          <motion.div
            style={{ y: card2Y, scale: card2Scale, opacity: card2Opacity }}
            className={`${cardShell} z-30`}
          >
            <TailoredExercisesCard />
          </motion.div>

          <motion.div
            style={{ y: card3Y, scale: card3Scale, opacity: card3Opacity }}
            className={`${cardShell} z-40`}
          >
            <TopCoachesCard />
          </motion.div>

          <motion.div
            style={{ y: card4Y, scale: card4Scale, opacity: card4Opacity }}
            className={`${cardShell} z-50`}
          >
            <CustomizedWorkoutsCard />
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
                onClick={() => scrollToCard(idx)}
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
