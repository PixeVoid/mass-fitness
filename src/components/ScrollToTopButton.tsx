"use client";

import { useEffect, useState } from "react";

/**
 * Floating shortcut back to the top, matched to the pill/island chrome the
 * header uses. Hidden until the visitor has actually scrolled somewhere —
 * showing it over the hero would just be a second, redundant control.
 */
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-[calc(1.25rem+var(--fab-stack,0px))] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-paper/80 text-ink shadow-[var(--shadow-soft)] backdrop-blur-xl transition-all duration-300 hover:bg-overlay sm:bottom-[calc(1.5rem+var(--fab-stack,0px))] sm:right-6 ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
