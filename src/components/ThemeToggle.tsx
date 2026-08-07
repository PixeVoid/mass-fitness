"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/**
 * Light/dark switch.
 *
 * Both icons are always in the DOM and CSS decides which is visible, using the
 * same `prefers-color-scheme` + `[data-theme]` selectors that drive the
 * palette. That makes the control correct in server-rendered HTML — an earlier
 * version returned a placeholder until an effect ran, which left a visible hole
 * in the header until hydration finished.
 *
 * The theme is external state (an attribute on <html>, plus the OS setting), so
 * it is read with useSyncExternalStore rather than mirrored into React state
 * from an effect.
 */

function subscribe(onChange: () => void) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", onChange);

  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => {
    mql.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

function getSnapshot(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// The server can't know the visitor's preference. Only the label depends on
// this, and CSS corrects the icon before paint either way.
const getServerSnapshot = (): Theme => "light";

export default function ThemeToggle({
  className = "h-9 w-9",
}: {
  className?: string;
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("mf-theme", next);
    } catch {
      // Private mode — the choice still applies for this session.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      // No default size: Tailwind resolves conflicts by stylesheet order, not
      // by the order classes appear in the string, so a caller passing `h-7`
      // after a built-in `h-9` may or may not win. The size comes from the
      // caller, and the one place it is used says what it wants.
      className={`flex items-center justify-center rounded-full text-ink transition-colors duration-300 hover:bg-overlay ${className}`}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Moon — shown while the page is light, i.e. "switch to dark" */}
        <path
          className="theme-icon-moon"
          d="M20.5 14.6A8.5 8.5 0 1 1 9.4 3.5a6.8 6.8 0 0 0 11.1 11.1Z"
        />
        {/* Sun — shown while the page is dark */}
        <g className="theme-icon-sun">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
        </g>
      </svg>
    </button>
  );
}
