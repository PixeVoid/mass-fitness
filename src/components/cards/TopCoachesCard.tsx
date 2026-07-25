"use client";

import { motion } from "framer-motion";
import { Row } from "./CardFrame";

const TRAINERS = [
  {
    initials: "JC",
    name: "John Carter",
    role: "Championship-winning coach",
    experience: "15+ yrs",
    inverted: true,
  },
  {
    initials: "TK",
    name: "Tatiana Kenter",
    role: "Strength & state-level",
    experience: "10 yrs",
    inverted: false,
  },
];

export const topCoachesMeta = {
  eyebrow: "Coaches",
  index: 3,
  visualLabel: "Member app — coach roster",
};

export function TopCoachesCopy() {
  return (
    <>
      <h2 className="display text-[2rem] text-ink sm:text-[2.75rem] lg:text-[3.25rem]">
        Coached by people who&rsquo;ve <em>done the reps.</em>
      </h2>

      <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-muted">
        Every trainer on the roster has spent years on a gym floor. You get the one whose specialism matches what you&rsquo;re training for.
      </p>

      <div className="mt-9">
        <a href="#pricing" className="btn btn-solid">
          Meet the team
        </a>
      </div>
    </>
  );
}

export function TopCoachesBadges() {
  return (
    <>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 left-0 z-20 hidden w-52 flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)] lg:flex"
      >
        <p className="label text-faint">Included</p>
        <p className="text-xs text-ink">Smart nutrition</p>
        <p className="text-[11px] leading-snug text-muted">
          A diet plan built alongside your programme, not sold separately.
        </p>
      </motion.div>

      <motion.div
        animate={{ y: [0, 9, 0] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute right-0 top-6 z-20 hidden flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)] lg:flex"
      >
        <p className="label text-faint">Avg. reply</p>
        <p className="numeric text-2xl text-ink">
          under 2<span className="text-base text-muted"> hrs</span>
        </p>
      </motion.div>
    </>
  );
}

export function TopCoachesScreen() {
  return (
    <>
      <div>
        <p className="label text-faint">Live coaching roster</p>
        <h3 className="display-sm mt-2 text-lg text-ink">Choose a trainer</h3>
      </div>

      <div className="my-auto flex flex-col gap-2.5">
        {TRAINERS.map((t) => (
          <div
            key={t.initials}
            className={`flex items-center justify-between gap-3 rounded-xl p-3 ${
              t.inverted
                ? "bg-inverse-bg text-inverse-fg"
                : "border border-line bg-surface-sunk"
            }`}
          >
            <div className="min-w-0">
              <p className={`text-xs ${t.inverted ? "" : "text-ink"}`}>{t.name}</p>
              <p
                className={`mt-1 truncate text-[10px] leading-tight ${
                  t.inverted ? "opacity-60" : "text-faint"
                }`}
              >
                {t.role}
              </p>
              <p
                className={`label numeric mt-2 ${
                  t.inverted ? "opacity-70" : "text-faint"
                }`}
              >
                {t.experience}
              </p>
            </div>
            <span
              className={`numeric flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs ${
                t.inverted
                  ? "border border-current/35"
                  : "border border-line text-muted"
              }`}
            >
              {t.initials}
            </span>
          </div>
        ))}
      </div>

      <Row>
        <p className="text-[11px] text-muted">1:1 real-time form correction</p>
      </Row>
    </>
  );
}
