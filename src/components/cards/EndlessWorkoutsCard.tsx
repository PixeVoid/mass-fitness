"use client";

import CardFrame from "./CardFrame";
import { DumbbellIcon, HeartPulseIcon, TargetIcon } from "../icons";

const TILES = [
  { name: "Core", count: "150", note: "10–20 min", icon: TargetIcon },
  { name: "Upper body", count: "390", note: "Dumbbells", icon: DumbbellIcon },
  {
    name: "Full body",
    count: "2,680",
    note: "No kit needed",
    icon: HeartPulseIcon,
  },
];

export default function EndlessWorkoutsCard() {
  return (
    <CardFrame
      eyebrow="Library"
      index={5}
      title={
        <>
          For the days you <em>can&rsquo;t make it.</em>
        </>
      }
      body="Over two thousand recorded sessions, filtered by time, equipment and focus. Twenty-five minutes and a mat is a complete workout."
      visualLabel="On-demand library — by focus"
      action={
        <a href="#pricing" className="btn btn-solid">
          Browse the library
        </a>
      }
    >
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {TILES.map((tile) => (
          <div
            key={tile.name}
            className="group/tile flex min-h-[170px] flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-colors duration-500 hover:border-line-strong sm:min-h-[220px]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="numeric text-3xl text-ink">{tile.count}</span>
              <span
                aria-hidden="true"
                className="block h-6 w-6 shrink-0 text-faint transition-colors duration-500 group-hover/tile:text-ink"
              >
                <tile.icon />
              </span>
            </div>
            <div>
              <h3 className="display-sm text-xl text-ink">{tile.name}</h3>
              <p className="label mt-2.5 text-faint">{tile.note}</p>
            </div>
          </div>
        ))}
      </div>
    </CardFrame>
  );
}
