"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FastLink from "@/components/ui/FastLink";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { LogoMark } from "./Logo";
import type { HeaderIdentity } from "@/lib/auth/dal";
import { scrollToFeatureCard } from "@/lib/featureScroll";

const LINKS = [
  // Home first. Off the landing page the section links go somewhere the
  // visitor has not been, and there was no link that simply meant "back to
  // the start" other than the wordmark, which not everyone reads as a button.
  { href: "/", label: "Home" },
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
 * Rendered on every page by SiteHeader, not just the landing page: dropping it
 * on /dashboard, /assessment and the legal pages left those routes with a bare
 * wordmark and no way back into the site, which read as a different product.
 *
 * Two kinds of "active" run through here. On the landing page the section
 * pills follow whichever section is under the top of the viewport. Everywhere
 * else there are no sections to track, and instead the pill for the current
 * *route* — today only the account pill, on /dashboard — carries the marker.
 */
export default function Nav({
  identity = null,
}: {
  identity?: HeaderIdentity | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolledSection, setScrolledSection] = useState<string>("");

  const isHome = pathname === "/";
  const onAccount = pathname.startsWith("/dashboard");

  // Off the landing page there are no sections to be inside, so the spy's last
  // reading is stale rather than merely unused — derived here instead of being
  // cleared from the effect, which would cost a second render to say nothing.
  const active = isHome ? scrolledSection : "";

  useEffect(() => {
    // The sections only exist on the landing page; anywhere else this would
    // be a scroll listener that can never match anything.
    if (!isHome) return;

    const onScroll = () => {
      if (window.scrollY < 120) {
        setScrolledSection("");
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
      setScrolledSection(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

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

    // "Home" is the route, not a fragment. On the landing page a Link to "/"
    // is a no-op — nothing about the URL changes — so it scrolls instead, the
    // same behaviour the wordmark has.
    if (href === "/") {
      goHome(e);
      return;
    }

    if (!href.startsWith("/#")) return;
    const slug = href.slice(2);

    // Off the landing page there is nothing to scroll to, so every one of
    // these has to fall through to real navigation. Each branch below only
    // takes over the click once it knows it has a target — a preventDefault
    // ahead of that check is what turned these into dead links on /dashboard.
    if (slug === "features") {
      if (scrollToFeatureCard(1)) e.preventDefault();
      return;
    }

    const target = document.getElementById(slug);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
  };

  const islandBase =
    "pointer-events-auto border border-line shadow-[var(--shadow-soft)] backdrop-blur-xl";

  // One explicit height for all three pills.
  //
  // They used to take their height from their contents, which meant the
  // wordmark island was sized by a line of text and the actions island by a
  // 36px icon button plus its padding — 40px against 48px on a phone, which
  // reads as the right-hand pill being swollen. Anything that must line up
  // should say so rather than arrive there by coincidence.
  const island = `${islandBase} rounded-full bg-paper/75 h-10 sm:h-12`;

  // Signed in, the pill is the way into the account; signed out it is the way
  // in at all. Pointing it straight at /dashboard matters for more than
  // wording: /login bounces an authenticated visitor onward, so leaving it as
  // "Login" cost a whole extra server round trip on every click.
  const accountHref = identity ? "/dashboard" : "/login";
  const accountLabel = identity ? identity.firstName : "Login";

  // A pill with someone's first name in it does not say what tapping it does.
  // On desktop the `title` attribute covers that; a phone has no hover, so the
  // caption below says it outright — then fades itself out, because a
  // permanent line under a fixed header is noise once it has been read.
  const showHint = Boolean(identity) && !onAccount;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 flex items-center justify-between gap-4 px-4 sm:top-6 sm:px-6 lg:px-8">
      {/* Wordmark */}
      <div className={`${island} flex items-center px-4 sm:px-5`}>
        <Link
          href="/"
          onClick={goHome}
          className="flex items-center gap-2 text-base text-ink transition-opacity hover:opacity-70 sm:gap-2.5 sm:text-lg"
        >
          <LogoMark className="h-5 sm:h-6" />
          {/* The wordmark text is dropped on the narrowest screens so the
              account pill fits beside the theme toggle. The mark alone still
              identifies the site, and the link still goes home. */}
          <span className="brand-mark hidden min-[380px]:inline">Mass Fitness</span>
        </Link>
      </div>

      {/* Links */}
      <nav
        aria-label="Primary"
        className={`${island} hidden items-center gap-1 px-1.5 md:flex`}
      >
        {LINKS.map((link) => {
          // Home carries the marker when no section does — at the top of the
          // landing page, which is exactly where "Home" means you are.
          const isActive =
            link.href === "/" ? isHome && active === "" : active === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => go(e, link.href)}
              aria-current={isActive ? "true" : undefined}
              className={`flex h-9 items-center rounded-full px-4 text-[0.8125rem] transition-colors duration-300 ${
                isActive
                  ? "nav-pill-active"
                  : "text-muted hover:bg-overlay hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Actions. The row is right-anchored, so a longer name grows the island
          leftwards on its own — the name only needs a ceiling so a very long
          one cannot push into the links. */}
      <div className="pointer-events-none relative flex flex-col items-end">
      <div className={`${island} flex items-center gap-1 px-1.5`}>
        <ThemeToggle className="h-7 w-7 sm:h-9 sm:w-9" />

        <FastLink
          href={accountHref}
          onClick={() => setOpen(false)}
          aria-current={onAccount ? "page" : undefined}
          title={identity ? `${identity.firstName} — your dashboard` : undefined}
          className={`flex h-7 items-center rounded-full px-3.5 text-[0.8125rem] font-medium transition-opacity duration-300 hover:opacity-80 sm:h-9 sm:px-5 ${
            onAccount
              ? "nav-pill-active nav-pill-glow"
              : "bg-inverse-bg text-inverse-fg nav-pill-glow"
          }`}
        >
          {/* The clamp lives on an inner span: the active ring is drawn just
              outside the pill, and an `overflow: hidden` on the pill itself
              would crop it to a stripe along the top edge. */}
          <span className="block max-w-[5.5rem] truncate sm:max-w-[9rem]">
            {accountLabel}
          </span>
        </FastLink>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-overlay sm:h-9 sm:w-9 md:hidden"
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

      {/* Sits under the pill rather than inside it, so the island keeps its
          shape and the caption can be dropped without reflowing anything. */}
      {showHint && (
        <p className="hint-fade pointer-events-none mt-1.5 mr-1 text-[0.6875rem] leading-none text-faint sm:hidden">
          Tap your name for your dashboard
        </p>
      )}
      </div>

      {/* Mobile sheet. Squared off rather than sharing the pills' `rounded-full`:
          on a tall column that radius clips the panel — background, border and
          backdrop-blur alike — into an ellipse, leaving the page showing
          through at the corners and the links floating on nothing. Opaquer
          than the pills too, since it has body text behind it, not a hero. */}
      {open && (
        <div
          className={`${islandBase} absolute inset-x-4 top-16 flex flex-col rounded-3xl sm:top-[4.5rem] bg-paper/95 p-3 md:hidden`}
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
            href={accountHref}
            onClick={() => setOpen(false)}
            aria-current={onAccount ? "page" : undefined}
            className={`btn mt-3 w-full ${
              onAccount ? "nav-pill-active" : "btn-solid"
            }`}
          >
            {identity ? `${identity.firstName} — dashboard` : "Login"}
          </Link>
        </div>
      )}
    </header>
  );
}
