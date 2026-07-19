type MarqueeProps = {
  items: string[];
};

export default function Marquee({ items }: MarqueeProps) {
  const track = [...items, ...items];

  return (
    <div className="group relative overflow-hidden border-y border-canvas/10 bg-shell py-4">
      <div className="animate-marquee flex w-max gap-8 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {track.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex items-center gap-8 font-display text-2xl uppercase tracking-wide text-canvas/70 sm:text-3xl"
          >
            {item}
            <span aria-hidden className="text-accent">
              •
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
