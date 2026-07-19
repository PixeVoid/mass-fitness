"use client";

import { useState } from "react";
import InvertedCorner from "./InvertedCorner";

const LINKS = [
  { href: "#classes", label: "Classes" },
  { href: "#pricing", label: "Pricing" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#contact", label: "Contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full">
      {/* 
        LEFT LOGO TAB
        bg-shell (#101012) dark tab.
        rounded-tl-[32px] sm:rounded-tl-[40px] matches outer container curve perfectly (no white arc leaks!).
        rounded-br-[28px] sm:rounded-br-[34px] curves into light canvas below.
      */}
      <div className="absolute top-0 left-0 z-30 bg-shell text-canvas px-6 sm:px-8 h-16 sm:h-20 flex items-center gap-3.5 rounded-br-[28px] sm:rounded-br-[34px]">
        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-shell border border-canvas/30 flex items-center justify-center shadow-inner">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent shadow-[0_0_10px_#ff4d2e]" />
        </div>
        <a
          href="#top"
          className="font-display text-lg sm:text-xl tracking-wider text-canvas uppercase hover:opacity-90 transition-opacity"
        >
          MASS FITNESS
        </a>
        {/* Concave Inverted Corner SVG - Overlaps 1px to eliminate seam lines */}
        <InvertedCorner
          dir="top-left"
          className="absolute top-0 left-[calc(100%-1px)] w-8 h-8 sm:w-9 sm:h-9 text-shell"
        />
      </div>

      {/* 
        LEFT-ALIGNED FLOATING PILL NAV (Matches FynSec Reference!)
        Floats over the Light Cream Canvas, right next to the left logo tab.
      */}
      <div className="absolute top-3.5 sm:top-5 left-[240px] sm:left-[290px] md:left-[320px] z-30 hidden md:flex items-center">
        <nav className="flex items-center gap-1.5 rounded-full border border-ink/25 bg-canvas/90 backdrop-blur-md px-5 py-2 sm:px-6 sm:py-2.5 shadow-sm">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium text-ink/80 hover:text-ink transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      {/* 
        RIGHT ACTIONS TAB
        bg-shell (#101012) dark tab.
        rounded-tr-[32px] sm:rounded-tr-[40px] matches outer container curve perfectly (no white arc leaks!).
        rounded-bl-[28px] sm:rounded-bl-[34px] curves into light canvas below.
      */}
      <div className="absolute top-0 right-0 z-30 bg-shell text-canvas px-6 sm:px-8 h-16 sm:h-20 flex items-center gap-3 rounded-bl-[28px] sm:rounded-bl-[34px]">
        {/* Concave Inverted Corner SVG - Overlaps 1px to eliminate seam lines */}
        <InvertedCorner
          dir="top-right"
          className="absolute top-0 right-[calc(100%-1px)] w-8 h-8 sm:w-9 sm:h-9 text-shell"
        />

        <button
          type="button"
          className="hidden sm:flex items-center gap-2 rounded-full border border-canvas/25 px-4 py-2 text-xs sm:text-sm font-sans text-canvas/85 hover:border-canvas/50 transition-colors"
        >
          <span>English</span>
          <svg
            className="w-3.5 h-3.5 text-canvas/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <a
          href="#pricing"
          className="group flex items-center gap-2.5 rounded-full border border-canvas/30 bg-shell px-5 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold text-canvas hover:bg-canvas hover:text-shell transition-all duration-200 shadow-sm"
        >
          <span className="flex h-5.5 w-5.5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-canvas/20 group-hover:bg-shell group-hover:text-canvas transition-colors">
            <svg
              className="h-3 w-3 text-canvas group-hover:text-canvas"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <span>Start training</span>
        </a>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas/15 text-canvas md:hidden ml-1"
        >
          <div className="flex h-3.5 w-4 flex-col justify-between">
            <span
              className={`h-0.5 w-full bg-canvas transition-transform ${
                open ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`h-0.5 w-full bg-canvas transition-opacity ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-0.5 w-full bg-canvas transition-transform ${
                open ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {open && (
        <div className="absolute left-3 right-3 top-20 z-40 flex flex-col gap-1.5 rounded-2xl bg-shell p-4 shadow-2xl border border-canvas/20 md:hidden pointer-events-auto">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="min-h-10 rounded-xl px-4 py-2.5 text-sm font-medium text-canvas/90 hover:bg-canvas/10 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#pricing"
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-11 items-center justify-center rounded-full bg-accent px-4 py-2.5 text-center text-sm font-semibold text-canvas"
          >
            Start training
          </a>
        </div>
      )}
    </header>
  );
}
