"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * The next class, counting down.
 *
 * A row in a list told a member *that* a class exists; it did not tell them
 * one was about to start. This does — and it flips itself to a live join
 * button at the moment the door opens, so nobody sits looking at a stale
 * "Not started" wondering whether to refresh.
 *
 * Everything the server can decide is decided there and passed in as
 * timestamps. This component only knows how to subtract two numbers, which is
 * what keeps it honest: no second copy of the join rules to drift out of step
 * with `classWindow`, and no assumption that the viewer's clock is right about
 * anything except how much time has *passed*.
 */

export interface NextClass {
  id: string;
  title: string;
  trainerName: string | null;
  /** Formatted server-side in IST so every viewer reads the same time. */
  formattedTime: string;
  durationMinutes: number;
  /** Epoch ms. The door, not the scheduled start. */
  opensAtMs: number;
  closesAtMs: number;
  startsAtMs: number;
  /** Decided server-side: membership, or hosting the class. */
  canJoin: boolean;
  isHost: boolean;
}

export default function NextClassBanner({
  nextClass,
  /** The server's clock at render, so a wrong device clock cannot skew the countdown. */
  serverNowMs,
}: {
  nextClass: NextClass;
  serverNowMs: number;
}) {
  // Two clocks, and the better one wins.
  //
  // The device's own clock is the accurate one *if* it is set correctly — it
  // includes the time the page spent in transit, which a server timestamp
  // cannot. So it is used whenever it agrees with the server to within a
  // minute. When it does not (a phone set to the wrong day), fall back to
  // counting forward from the server's reading, which only asks the device to
  // tick at one second per second — something even a badly set clock does.
  const [tick, setTick] = useState(() => Date.now());
  const [mountedAt] = useState(() => Date.now());

  const deviceIsSane = Math.abs(serverNowMs - mountedAt) < 60_000;
  const now = deviceIsSane ? tick : serverNowMs + (tick - mountedAt);
  const isOpen = now >= nextClass.opensAtMs && now < nextClass.closesAtMs;
  const msUntilOpen = nextClass.opensAtMs - now;

  useEffect(() => {
    // Nothing left to count once the door is open.
    if (isOpen) return;

    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  if (now >= nextClass.closesAtMs) return null;

  return (
    <div className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="label flex items-center gap-2.5 text-faint">
            {isOpen && <span className="live-dot" aria-hidden="true" />}
            {isOpen ? "Happening now" : "Next class"}
          </p>

          <h2 className="display-sm mt-4 text-[1.625rem] text-ink sm:text-[1.875rem]">
            {nextClass.title}
          </h2>

          <p className="mt-2 text-[0.9375rem] text-muted">
            {nextClass.trainerName ? `with ${nextClass.trainerName} · ` : ""}
            {nextClass.formattedTime} · {nextClass.durationMinutes} min
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 sm:items-end">
          {!isOpen && (
            <p className="numeric text-[1.75rem] leading-none text-ink">
              {formatCountdown(msUntilOpen)}
            </p>
          )}

          {isOpen && nextClass.canJoin ? (
            <Link href={`/live/${nextClass.id}`} className="btn btn-solid">
              {nextClass.isHost ? "Start class" : "Join now"}
            </Link>
          ) : isOpen ? (
            <Link href="/subscribe" className="btn btn-outline">
              Members only
            </Link>
          ) : (
            <p className="label text-faint">
              {nextClass.canJoin ? "Doors open 20 min early" : "Members only"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * "2d 4h", "3h 12m", "14:03" — the unit gets finer as the moment approaches,
 * because "1 day 3 hours 12 minutes 6 seconds" is a number nobody reads. Only
 * the last hour is worth watching second by second.
 */
function formatCountdown(ms: number): string {
  if (ms <= 0) return "starting";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
