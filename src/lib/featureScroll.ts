/**
 * Cards in the hero scroll-stack are absolutely positioned and driven by
 * scroll progress rather than document flow, so a plain `#id` anchor can't
 * land on one — the target scroll offset has to be computed the same way
 * the stack's own pagination does. This is that computation, shared so the
 * header nav and footer links can jump to a specific card instead of only
 * the top of the stack.
 */

export const CARD_TARGET_PROGRESS = [0, 0.2, 0.4, 0.6, 0.8, 0.95];

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
