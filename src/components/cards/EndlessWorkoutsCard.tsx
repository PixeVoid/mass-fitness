"use client";

import CardFrame from "./CardFrame";

const TILES = [
  { name: "Core", count: "150", note: "10–20 min" },
  { name: "Upper body", count: "390", note: "Dumbbells" },
  { name: "Full body", count: "2,680", note: "No kit needed" },
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
            className="flex min-h-[170px] flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-colors duration-500 hover:border-line-strong sm:min-h-[220px]"
          >
            <span className="numeric text-3xl text-ink">{tile.count}</span>
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
