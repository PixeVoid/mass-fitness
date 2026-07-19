"use client";

const CLASSES = [
  {
    name: "Strength",
    tag: "45 min · Bodyweight + dumbbells",
    gradient: "from-[#ff4d2e] to-[#ff8a63]",
  },
  {
    name: "HIIT",
    tag: "30 min · No equipment",
    gradient: "from-[#1b1f1a] to-[#4a5142]",
  },
  {
    name: "Mobility",
    tag: "25 min · Mat only",
    gradient: "from-[#c9cfc6] to-[#8f9a86]",
  },
  {
    name: "Conditioning",
    tag: "40 min · Optional bands",
    gradient: "from-[#ff8a63] to-[#101012]",
  },
];

export default function ClassGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {CLASSES.map((item) => (
        <div
          key={item.name}
          tabIndex={0}
          className="group relative min-h-[220px] overflow-hidden rounded-3xl bg-shell p-6 focus-visible:outline-2 focus-visible:outline-accent sm:min-h-[260px] sm:p-7"
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-90 group-focus-visible:opacity-90 ${item.gradient}`}
          />
          <div className="relative flex h-full flex-col justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-canvas/50 transition-colors duration-500 group-hover:text-canvas/80">
              {item.tag}
            </span>
            <h3 className="font-display text-3xl text-canvas transition-transform duration-500 group-hover:translate-x-1 sm:text-4xl">
              {item.name}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
}
