"use client";

import { motion } from "framer-motion";
import CardFrame, { Phone, Row } from "./CardFrame";

const BARS = [16, 28, 20, 40, 32];

export default function FitnessJourneyCard() {
  return (
    <CardFrame
      eyebrow="Your plan"
      index={1}
      title={
        <>
          The plan starts <em>with you.</em>
        </>
      }
      body="We benchmark where you're starting from, then build volume and progression around the days you can actually train."
      visualLabel="Member app — today's plan"
      action={
        <div className="flex flex-wrap gap-3">
          <a href="#pricing" className="btn btn-solid">
            Get started
          </a>
          <a href="#classes" className="btn btn-outline">
            Browse classes
          </a>
        </div>
      }
    >
      {/* Floating: coach */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-0 top-4 z-20 hidden max-w-[220px] items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-[var(--shadow-soft)] lg:flex"
      >
        <span className="numeric flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-[11px] text-muted">
          DK
        </span>
        <div>
          <p className="text-xs text-ink">Davis Korsgaard</p>
          <p className="mt-0.5 text-[11px] leading-tight text-faint">
            Head coach · live now
          </p>
        </div>
      </motion.div>

      {/* Floating: weekly volume */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute right-0 top-10 z-20 hidden w-40 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)] lg:flex"
      >
        <p className="label text-faint">This week</p>
        <div className="flex h-10 items-end gap-1.5">
          {BARS.map((h, i) => (
            <span
              key={h}
              className={`w-1/5 rounded-sm ${i === 3 ? "bg-ink" : "bg-line-strong"}`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </motion.div>

      {/* Floating: session complete */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-6 right-2 z-20 hidden items-center rounded-full border border-line bg-surface py-2.5 pl-5 pr-6 shadow-[var(--shadow-soft)] lg:flex"
      >
        <div>
          <p className="label text-faint">Legs · completed</p>
          <p className="numeric mt-1.5 text-xs text-ink">1h 30m</p>
        </div>
      </motion.div>

      <Phone>
        <div className="flex items-center justify-between">
          <div>
            <p className="label text-faint">Welcome back</p>
            <p className="mt-1.5 text-sm text-ink">Hey, Janet</p>
          </div>
          <span
            aria-hidden="true"
            className="h-7 w-7 rounded-full border border-line bg-surface-sunk"
          />
        </div>

        <div className="my-3 flex flex-1 flex-col justify-between rounded-2xl bg-inverse-bg p-4 text-inverse-fg">
          <span className="label w-fit rounded-full border border-current px-2.5 py-1.5 opacity-60">
            Beginner
          </span>
          <div>
            <h3 className="display-sm text-[1.375rem]">5-day strength boost</h3>
            <p className="mt-1.5 text-[11px] opacity-60">Full body conditioning</p>
          </div>
          <span className="flex h-9 w-full items-center justify-center rounded-full border border-current/40 text-xs opacity-90">
            Continue
          </span>
        </div>

        <Row>
          <div>
            <p className="label text-faint">Full body focus</p>
            <p className="mt-1.5 text-xs text-ink">3 sessions this week</p>
          </div>
          <span className="numeric text-xs text-ink">75%</span>
        </Row>
      </Phone>
    </CardFrame>
  );
}
