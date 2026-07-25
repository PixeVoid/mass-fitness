/**
 * Cards in the hero scroll-stack are absolutely positioned and driven by
 * scroll progress rather than document flow, so a plain `#id` anchor can't
 * land on one — the target scroll offset has to be computed the same way
 * the stack's own pagination does. This is that computation, shared so the
 * header nav and footer links can jump to a specific card instead of only
 * the top of the stack.
 */

/**
 * The stack is laid out from one number so that every card costs exactly the
 * same amount of scrolling. This is the single source of truth: the stage
 * animations, the pagination targets, and the active-dot thresholds are all
 * derived from it. They used to be three hand-written sets of numbers that
 * disagreed with each other, which is what made one card take longer to pass
 * than its neighbour and made the dots light up out of step with the content.
 *
 * Each stage occupies one STAGE_WIDTH slice. The hero leads with a half
 * slice (it is already on screen at rest, so it only has to recede) and the
 * library trails with the remainder, which it spends held while the stack
 * releases the page.
 */
export const STAGE_WIDTH = 0.18;

const HERO_END = STAGE_WIDTH / 2;

export const STAGE_RANGES: readonly (readonly [number, number])[] = [
  [0, HERO_END], // 0 — hero
  [HERO_END, HERO_END + STAGE_WIDTH], // 1 — your plan
  [HERO_END + STAGE_WIDTH, HERO_END + STAGE_WIDTH * 2], // 2 — live classes
  [HERO_END + STAGE_WIDTH * 2, HERO_END + STAGE_WIDTH * 3], // 3 — coaches
  [HERO_END + STAGE_WIDTH * 3, HERO_END + STAGE_WIDTH * 4], // 4 — progress
  [HERO_END + STAGE_WIDTH * 4, 1], // 5 — library
];

/** Half-width of the band a stage takes to slide in or out. */
export const STAGE_TRANSITION_HALF = 0.025;

/**
 * Pagination lands a half-slice into each stage — the middle of its hold —
 * so clicking a dot settles on the card rather than on the seam between two
 * of them. The hero is the exception: it targets the very top. Because every
 * slice is the same width, consecutive dots are always the same distance
 * apart.
 */
export const CARD_TARGET_PROGRESS = STAGE_RANGES.map(([start], i) =>
  i === 0 ? 0 : start + STAGE_WIDTH / 2,
);

export function stageIndexForProgress(progress: number): number {
  for (let i = STAGE_RANGES.length - 1; i > 0; i--) {
    if (progress >= STAGE_RANGES[i][0]) return i;
  }
  return 0;
}

const SLUG_TO_CARD_INDEX: Record<string, number> = {
  features: 1,
  "your-plan": 1,
  "live-classes": 2,
  coaches: 3,
  progress: 4,
  library: 5,
};

export function scrollToFeatureCard(index: number): boolean {
  const container = document.getElementById("features-stack");
  if (!container) return false;

  const containerTop = container.getBoundingClientRect().top + window.scrollY;
  const containerHeight = container.clientHeight - window.innerHeight;
  window.scrollTo({
    top: containerTop + containerHeight * CARD_TARGET_PROGRESS[index],
    behavior: "smooth",
  });
  return true;
}

export function scrollToFeatureSlug(slug: string): boolean {
  const index = SLUG_TO_CARD_INDEX[slug];
  if (index === undefined) return false;
  return scrollToFeatureCard(index);
}
