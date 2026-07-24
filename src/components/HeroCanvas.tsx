"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";

const ParticleHero = dynamic(() => import("./ParticleHero"), {
  ssr: false,
  loading: () => null,
});

function useMediaQuery(query: string, serverFallback = false) {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : serverFallback),
    () => serverFallback,
  );
}

/**
 * Resolves the current `--ink` value so the particle figure is drawn in the
 * page's own text colour and flips with the theme. Three.js needs a concrete
 * colour string, so the CSS variable has to be read rather than inherited —
 * and re-read whenever the toggle rewrites `data-theme` or the OS preference
 * changes underneath us.
 */
function useInkColor() {
  const [color, setColor] = useState("#121212");

  useEffect(() => {
    const read = () => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue("--ink")
        .trim();
      if (value) setColor(value);
    };

    read();

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", read);

    return () => {
      observer.disconnect();
      mql.removeEventListener("change", read);
    };
  }, []);

  return color;
}

export default function HeroCanvas() {
  const [ready, setReady] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)", false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const ink = useInkColor();

  const density = isMobile ? 1400 : 3400;

  useEffect(() => {
    // Defer mounting the canvas one frame past first paint so it never
    // competes with LCP for the headline.
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className="h-full w-full bg-[radial-gradient(circle_at_50%_45%,var(--overlay),transparent_70%)]"
      />
    );
  }

  return (
    <div className="relative h-full w-full" aria-hidden>
      {/* Always painted underneath. If WebGL is unavailable — headless
          browsers, blocked contexts, older hardware — the column still reads
          as a composed space instead of going blank. */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,var(--overlay),transparent_68%)]" />
      {ready && <ParticleHero density={density} color={ink} />}
    </div>
  );
}
