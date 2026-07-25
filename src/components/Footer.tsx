"use client";

import Link from "next/link";
import { LogoMark } from "./Logo";
import { scrollToFeatureSlug } from "@/lib/featureScroll";

const COMPANY_LINKS = [
  { href: "/about", label: "About us" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#classes", label: "Classes" },
  { href: "/#contact", label: "Contact" },
];

const PROGRAM_LINKS = [
  { href: "/#your-plan", label: "Fitness plan setup" },
  { href: "/#classes", label: "Live online classes" },
  { href: "/#library", label: "Home workouts" },
  { href: "/#coaches", label: "Expert trainers" },
  { href: "/#library", label: "Workout library" },
];

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy policy" },
  { href: "/terms-and-conditions", label: "Terms & conditions" },
  { href: "/refund-policy", label: "Refund policy" },
  { href: "/disclaimer", label: "Disclaimer" },
];

const SOCIAL_LINKS = [
  {
    href: "https://www.instagram.com/massfitness.in/",
    label: "Instagram",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    href: "https://www.youtube.com/@MassFitness-f4k",
    label: "YouTube",
    icon: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
        <path d="M10.5 9.5l5 2.5-5 2.5v-5z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    href: "https://wa.me/916207524549",
    label: "WhatsApp",
    icon: (
      <>
        <path d="M3.5 20.5l1.3-4.2A8.2 8.2 0 1 1 8 19.4l-4.5 1.1Z" />
        <path d="M8.9 8.4c.6 2.4 2.3 4.1 4.7 4.7" />
      </>
    ),
  },
  {
    href: "https://www.facebook.com/massfitness.in",
    label: "Facebook",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <path d="M14.8 8.2h-1.3c-.8 0-1.3.5-1.3 1.3V11h2.5l-.4 2.4h-2.1v5" />
        <path d="M10 11h2" />
      </>
    ),
  },
];

const APP_LINKS = [
  { href: "https://apps.apple.com", top: "Download on the", name: "App Store" },
  { href: "https://play.google.com", top: "Get it on", name: "Google Play" },
];

// A card in the hero scroll-stack has no real document position of its own,
// so a plain hash link would just land at the top of the stack. Where the
// href names one of those cards, resolve it with the shared scroll helper
// instead of letting the browser jump to a nonexistent anchor.
function handleFooterLinkClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
) {
  if (!href.startsWith("/#")) return;
  if (scrollToFeatureSlug(href.slice(2))) {
    e.preventDefault();
  }
}

// A same-page Link to "/" is a no-op in Next.js, so clicking the brand mark
// while already on the homepage (just scrolled down) would otherwise do
// nothing — same fix as the header's wordmark.
function handleBrandClick(e: React.MouseEvent<HTMLAnchorElement>) {
  if (window.location.pathname !== "/") return;
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <nav aria-label={heading}>
      <h2 className="label text-faint">{heading}</h2>
      <ul className="mt-6 flex flex-col items-start gap-3.5" role="list">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              onClick={(e) => handleFooterLinkClick(e, link.href)}
              className="link text-sm"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      id="footer"
      className="relative overflow-hidden border-t border-line"
      aria-label="Site footer"
      itemScope
      itemType="https://schema.org/WPFooter"
    >
      <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-20 sm:px-8 sm:pt-24 lg:px-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-14 lg:grid-cols-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-4">
            <Link
              href="/"
              onClick={handleBrandClick}
              className="flex items-center gap-2.5 text-2xl text-ink"
            >
              <LogoMark className="h-8" />
              <span className="brand-mark">Mass Fitness</span>
            </Link>

            <p className="mt-5 max-w-xs text-[0.9375rem] leading-relaxed text-muted">
              India&rsquo;s online fitness platform — live coach-led classes,
              personalised workout and diet plans, and structured home training.
            </p>

            <div className="mt-8 flex flex-col items-start gap-2">
              <a
                href="mailto:fitnessbymass@gmail.com"
                className="link numeric text-sm"
              >
                fitnessbymass@gmail.com
              </a>
              <a
                href="https://wa.me/916207524549"
                target="_blank"
                rel="noopener noreferrer"
                className="link numeric text-sm"
              >
                +91 62075 24549
              </a>
            </div>

            <ul className="mt-8 flex items-center gap-3" role="list">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    aria-label={`Mass Fitness on ${social.label}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-line-strong hover:text-ink"
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
                      {social.icon}
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <FooterColumn heading="Company" links={COMPANY_LINKS} />
          </div>
          <div className="lg:col-span-2">
            <FooterColumn heading="Programmes" links={PROGRAM_LINKS} />
          </div>
          <div className="lg:col-span-2">
            <FooterColumn heading="Legal" links={LEGAL_LINKS} />
          </div>

          {/* App */}
          <div className="col-span-2 lg:col-span-2">
            <h2 className="label text-faint">Get the app</h2>
            <div className="mt-6 flex flex-col gap-2.5">
              {APP_LINKS.map((app) => (
                <a
                  key={app.name}
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${app.top} ${app.name}`}
                  className="rounded-xl border border-line px-4 py-3 transition-colors duration-300 hover:border-line-strong"
                >
                  <p className="text-[10px] leading-none text-faint">{app.top}</p>
                  <p className="mt-1.5 text-[0.8125rem] leading-none text-ink">
                    {app.name}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Oversized wordmark. Clipped by the footer and kept at very low
          contrast so it reads as a watermark, not a headline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none overflow-hidden px-5 sm:px-8 lg:px-12"
      >
        <span
          className="display block whitespace-nowrap text-ink opacity-[0.06]"
          style={{ fontSize: "clamp(4rem, 15.5vw, 15rem)", lineHeight: 0.85 }}
        >
          Mass Fitness
        </span>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-4 border-t border-line py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="label text-faint">
            &copy; {year} Mass Fitness &mdash; a{" "}
            <a
              href="https://pixevoid.in"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 transition-colors hover:text-ink"
            >
              PixeVoid
            </a>{" "}
            product
          </p>
          <p className="max-w-lg text-xs leading-relaxed text-faint">
            Consult a physician before starting any exercise programme. Content
            is for adults 16+.
          </p>
        </div>
      </div>
    </footer>
  );
}
