"use client";

import { motion } from "framer-motion";
import CardFrame, { Phone, Row } from "./CardFrame";

const ASSESSMENT = [
  { value: "5'11\", 140 lbs", label: "Body assessment", done: true },
  { value: "2,658 kcal", label: "Daily target", done: true },
  { value: "Full body", label: "Workout focus", done: false },
  { value: "Beginner", label: "Starting level", done: false },
];

export default function CustomizedWorkoutsCard() {
  return (
    <CardFrame
      eyebrow="Progress"
      index={4}
      title={
        <>
          The programme <em>moves as you do.</em>
        </>
      }
      body="Load, volume and rest are re-cut against what you actually completed last week — not against the plan you were sold on day one."
      visualLabel="Member app — progress"
      action={
        <a href="#pricing" className="btn btn-solid">
          Build your plan
        </a>
      }
    >
      {/* Floating: consistency note */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 right-0 z-20 hidden w-52 flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)] lg:flex"
      >
        <p className="label text-faint">Adherence</p>
        <p className="numeric text-2xl text-ink">
          92<span className="text-base text-muted">%</span>
        </p>
        <p className="text-[11px] leading-snug text-muted">
          Sessions completed against sessions scheduled.
        </p>
      </motion.div>

      {/* Floating: last lift */}
      <motion.div
        animate={{ y: [0, 9, 0] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        className="absolute left-0 top-8 z-20 hidden flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)] lg:flex"
      >
        <p className="label text-faint">Back squat · 1RM</p>
        <p className="numeric text-2xl text-ink">
          82.5<span className="text-base text-muted"> kg</span>
        </p>
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Phone>
          <div>
            <p className="label text-faint">Personal plan setup</p>
            <h3 className="display-sm mt-2 text-lg text-ink">Your programme</h3>
          </div>

          <div className="my-auto flex flex-col gap-2">
            {ASSESSMENT.map((item) => (
              <Row key={item.label}>
                <div className="min-w-0">
                  <p className="truncate text-xs text-ink">{item.value}</p>
                  <p className="mt-1 text-[10px] text-faint">{item.label}</p>
                </div>
                {item.done && (
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 shrink-0 text-ink"
                    role="img"
                    aria-label="Complete"
                  >
                    <path d="M4 10.5 8 14.5 16 5.5" />
                  </svg>
                )}
              </Row>
            ))}
          </div>

          <div className="rounded-xl bg-inverse-bg p-3.5 text-inverse-fg">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="label opacity-60">Goal completion</span>
              <span className="numeric text-xs">36%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-current/25">
              <div className="h-full w-[36%] rounded-full bg-current" />
            </div>
          </div>
        </Phone>
      </motion.div>
    </CardFrame>
  );
}
