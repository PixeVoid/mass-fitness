"use client";

import { useEffect } from "react";

const READY = "";
const HIDDEN = "hidden";

/**
 * Drives the scroll-reveal transition for every `data-reveal` element,
 * including ones mounted later.
 *
 * Elements are visible by default and this only hides the ones currently below
 * the fold, measured synchronously. Doing it the other way round — hide
 * everything, then reveal what's on screen — blanks the page for a frame,
 * because an IntersectionObserver's first callback is asynchronous.
 *
 * Note the markup writes `data-reveal=""` explicitly: a valueless JSX
 * attribute is a boolean, which React serialises as `data-reveal="true"` and
 * would not match the selectors below.
 */
export default function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", READY);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    const arm = () => {
      const fold = window.innerHeight * 0.95;
      for (const el of document.querySelectorAll<HTMLElement>('[data-reveal=""]')) {
        // Already on screen (or scrolled past): leave it alone. Animating it
        // in would be a flash the user reads as a rendering glitch.
        if (el.getBoundingClientRect().top < fold) continue;
        el.setAttribute("data-reveal", HIDDEN);
        observer.observe(el);
      }
    };

    arm();

    // Cards inside the scroll stack mount after the first pass.
    const mutation = new MutationObserver(arm);
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);

  return null;
}
