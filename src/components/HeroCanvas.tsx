"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ParticleHero = dynamic(() => import("./ParticleHero"), {
  ssr: false,
  loading: () => null,
});

export default function HeroCanvas() {
  const [ready, setReady] = useState(false);
  const [density, setDensity] = useState(2200);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const motionMql = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Mobile gets a meaningfully lighter particle count — phone GPUs and
    // data plans can't carry the same shader/point load as desktop.
    setDensity(mql.matches ? 700 : 2200);
    setReducedMotion(motionMql.matches);

    const onResize = () => setDensity(mql.matches ? 700 : 2200);
    mql.addEventListener("change", onResize);
    return () => mql.removeEventListener("change", onResize);
  }, []);

  useEffect(() => {
    // Defer mounting the canvas one tick past first paint so it never
    // competes with LCP for the headline text.
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className="h-full w-full rounded-3xl bg-[radial-gradient(circle_at_50%_40%,rgba(255,77,46,0.35),transparent_65%)]"
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      {!ready && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_40%,rgba(255,77,46,0.25),transparent_65%)]"
        />
      )}
      {ready && <ParticleHero density={density} />}
    </div>
  );
}
