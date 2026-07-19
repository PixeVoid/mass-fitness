"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ambient cursor-follow color glow, borrowed from the reference video's
 * signature interaction. Scoped to its parent container (absolute, not
 * fixed) so it can never drift over other sections of the page, and uses
 * plain low-opacity color instead of a blend mode — `mix-blend-multiply`
 * on the light cream background was darkening into a muddy stain rather
 * than reading as a glow. Desktop-only (no cursor on touch), off under
 * reduced-motion, and invisible until the pointer actually moves so it
 * never appears "stuck" somewhere on load.
 */
export default function CursorBlob() {
  const containerRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const raf = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (isTouch || reducedMotion) return;

    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const withinBounds =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      setActive(withinBounds);
      target.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener("mousemove", onMove);

    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.09;
      pos.current.y += (target.current.y - pos.current.y) * 0.09;
      if (blobRef.current) {
        blobRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(-50%, -50%)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden md:block"
    >
      <div
        ref={blobRef}
        className={`h-[380px] w-[380px] rounded-full blur-3xl transition-opacity duration-500 ${
          active ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(255,77,46,0.16) 0%, rgba(255,77,46,0.06) 45%, transparent 70%)",
        }}
      />
    </div>
  );
}
