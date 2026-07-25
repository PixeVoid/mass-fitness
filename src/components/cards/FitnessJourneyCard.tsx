"use client";

import { motion } from "framer-motion";
import { Row } from "./CardFrame";
import { BoltIcon, DumbbellIcon } from "../icons";

const BARS = [16, 28, 20, 40, 32];

export const fitnessJourneyMeta = {
  eyebrow: "Your plan",
  index: 1,
  visualLabel: "Member app — today's plan",
};

export function FitnessJourneyCopy() {
  return (
    <>
      <h2 className="display text-[1.625rem] text-ink sm:text-[2.75rem] lg:text-[3.25rem]">
        The plan starts <em>with you.</em>
      </h2>

      <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted sm:mt-6">
        We benchmark where you&rsquo;re starting from, then build volume and progression around the days you can actually train.
      </p>

      <div className="mt-6 flex flex-wrap gap-2.5 sm:mt-9 sm:gap-3">
        <a href="#pricing" className="btn btn-solid">
          Get started
        </a>
        <a href="#classes" className="btn btn-outline">
          Browse classes
        </a>
      </div>
    </>
  );
}

export function FitnessJourneyBadges() {
  return (
    <>
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

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute right-0 top-10 z-20 hidden w-40 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)] lg:flex"
      >
        <p className="label flex items-center gap-2 text-faint">
          <span aria-hidden="true" className="block h-3.5 w-3.5">
            <BoltIcon />
          </span>
          This week
        </p>
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

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-6 right-2 z-20 hidden items-center rounded-full border border-line bg-surface py-2.5 pl-5 pr-6 shadow-[var(--shadow-soft)] lg:flex"
      >
        <div>
          <p className="label flex items-center gap-2 text-faint">
            <span aria-hidden="true" className="block h-3.5 w-3.5">
              <DumbbellIcon />
            </span>
            Legs · completed
          </p>
          <p className="numeric mt-1.5 text-xs text-ink">1h 30m</p>
        </div>
      </motion.div>
    </>
  );
}

export function FitnessJourneyScreen() {
  return (
    <>
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
        <div className="flex items-start justify-between gap-3">
          <span className="label w-fit rounded-full border border-current px-2.5 py-1.5 opacity-60">
            Beginner
          </span>
          <span aria-hidden="true" className="block h-6 w-6 shrink-0 opacity-40">
            <DumbbellIcon />
          </span>
        </div>
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
    </>
  );
}
