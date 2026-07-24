"use client";

import { motion } from "framer-motion";
import CardFrame, { Phone, Row } from "./CardFrame";
import { PlayIcon } from "../icons";

const AVATARS = ["RS", "MK", "AT"];

export default function TailoredExercisesCard() {
  return (
    <CardFrame
      eyebrow="Live classes"
      index={2}
      title={
        <>
          Sessions that are <em>actually live.</em>
        </>
      }
      body="Not a video you press play on. Your coach is watching the room, calling out the hip that's dropping, and holding the tempo."
      visualLabel="Member app — live class"
      action={
        <a href="#classes" className="btn btn-solid">
          See the schedule
        </a>
      }
    >
      {/* Floating: social proof */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className="absolute right-0 top-8 z-20 hidden items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-[var(--shadow-soft)] lg:flex"
      >
        <div className="flex -space-x-2">
          {AVATARS.map((initials) => (
            <span
              key={initials}
              className="numeric inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-[10px] text-muted"
            >
              {initials}
            </span>
          ))}
        </div>
        <div>
          <p className="numeric text-xs text-ink">+160k</p>
          <p className="label mt-1 text-faint">Training together</p>
        </div>
      </motion.div>

      {/* Floating: consistency */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-8 left-0 z-20 hidden max-w-[210px] flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-soft)] lg:flex"
      >
        <p className="label text-faint">Streak</p>
        <p className="numeric text-2xl text-ink">18 days</p>
        <p className="text-[11px] leading-snug text-muted">
          Longest run so far. Two more and you beat it.
        </p>
      </motion.div>

      <Phone>
        <div className="flex items-center gap-2 text-faint">
          <span aria-hidden="true" className="text-xs">
            &larr;
          </span>
          <p className="label">Pick a class</p>
        </div>

        <div className="my-3 flex-1 overflow-hidden rounded-2xl bg-inverse-bg text-inverse-fg">
          <div className="relative flex h-[58%] items-center justify-center border-b border-current/15">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-current/40 p-3.5">
              <PlayIcon />
            </span>
          </div>
          <div className="p-3.5">
            <h3 className="display-sm text-lg">HIIT fat burn</h3>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="label opacity-55">25 min</span>
              <span className="label flex items-center gap-1.5 opacity-90">
                <span className="live-dot" aria-hidden="true" />
                Live
              </span>
            </div>
          </div>
        </div>

        <Row>
          <p className="text-[11px] text-muted">12,400 members live today</p>
        </Row>
      </Phone>
    </CardFrame>
  );
}
