"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { LogoMark } from "./Logo";
import { scrollToFeatureCard } from "@/lib/featureScroll";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#classes", label: "Classes" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#contact", label: "Contact" },
];

const SECTION_IDS = ["features", "classes", "how-it-works", "pricing", "contact"];

/**
 * Floating pill header — three islands over the page rather than a solid bar.
 *
 * The active pill is driven by which section is under the top of the viewport.
 * The previous version also owned an expanding sub-tab strip wired to the
 * scroll-stack's internal progress; that coupling is gone. The stack now owns
 * its own pagination, which is where it belongs.
 */
export default function Nav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY < 120) {
        setActive("");
        return;
      }
      let current = "";
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 220 && rect.bottom >= 160) {
          current = `/#${id}`;
          break;
        }
      }
      setActive(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // A same-page Link to "/" is a no-op in Next.js — nothing about the URL
  // changes, so nothing happens, and clicking the logo while scrolled down
  // reads as dead. Off the homepage the normal Link navigation already
  // works, so this only needs to handle the case where we're already here.
  const goHome = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setOpen(false);
    if (window.location.pathname !== "/") return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setOpen(false);
    if (!href.startsWith("/#")) return;
    const slug = href.slice(2);

    if (slug === "features") {
      e.preventDefault();
      scrollToFeatureCard(1);
      return;
    }

    const target = document.getElementById(slug);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
  };

  const island =
    "pointer-events-auto rounded-full border border-line bg-paper/75 shadow-[var(--shadow-soft)] backdrop-blur-xl";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex items-center justify-between gap-4 px-4 sm:top-6 sm:px-6 lg:px-8">
      {/* Wordmark */}
      <div className={`${island} px-4 py-2 sm:px-5 sm:py-2.5`}>
        <Link
          href="/"
          onClick={goHome}
          className="flex items-center gap-2 text-base text-ink transition-opacity hover:opacity-70 sm:gap-2.5 sm:text-lg"
        >
          <LogoMark className="h-5 sm:h-6" />
          <span className="display-sm">Mass Fitness</span>
        </Link>
      </div>

      {/* Links */}
      <nav
        aria-label="Primary"
        className={`${island} hidden items-center gap-1 p-1.5 md:flex`}
      >
        {LINKS.map((link) => {
          const isActive = active === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => go(e, link.href)}
              aria-current={isActive ? "true" : undefined}
              className={`rounded-full px-4 py-2 text-[0.8125rem] transition-colors duration-300 ${
                isActive
                  ? "bg-inverse-bg text-inverse-fg"
                  : "text-muted hover:bg-overlay hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Actions */}
      <div className={`${island} flex items-center gap-1 p-1.5`}>
        <ThemeToggle />

        <Link
          href="/#pricing"
          onClick={(e) => go(e, "/#pricing")}
          className="hidden rounded-full bg-inverse-bg px-5 py-2.5 text-[0.8125rem] font-medium text-inverse-fg transition-opacity duration-300 hover:opacity-80 sm:block"
        >
          Login
        </Link>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-overlay md:hidden"
        >
          <span aria-hidden="true" className="relative block h-3 w-4">
            <span
              className={`absolute left-0 block h-px w-full bg-current transition-all duration-300 ${
                open ? "top-1.5 rotate-45" : "top-0.5"
              }`}
            />
            <span
              className={`absolute left-0 block h-px w-full bg-current transition-all duration-300 ${
                open ? "top-1.5 -rotate-45" : "top-[0.625rem]"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div
          className={`${island} absolute inset-x-4 top-[4.5rem] flex flex-col p-3 md:hidden`}
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => go(e, link.href)}
              className="display-sm rounded-2xl px-4 py-3 text-xl text-ink transition-colors hover:bg-overlay"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/#pricing"
            onClick={(e) => go(e, "/#pricing")}
            className="btn btn-solid mt-3 w-full"
          >
            Login
          </Link>
        </div>
      )}
    </header>
  );
}
