"use client";

import FastLink from "@/components/ui/FastLink";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { glyphs } from "@/components/ui/glyphs";

/**
 * The admin section nav, with a marker for where you are.
 *
 * A client component only because the current path is the whole point and a
 * layout on the server does not get one. It renders nothing but links, so the
 * cost is a few hundred bytes for the thing that stops every admin page
 * looking identical to every other admin page.
 */

const TABS = [
  { href: "/admin", label: "Overview", glyph: glyphs.overview },
  { href: "/admin/members", label: "Members", glyph: glyphs.members },
  { href: "/admin/classes", label: "Classes", glyph: glyphs.classes },
  { href: "/admin/groups", label: "Groups", glyph: glyphs.groups },
  { href: "/admin/leads", label: "Leads", glyph: glyphs.leads },
  { href: "/admin/pricing", label: "Pricing", glyph: glyphs.pricing },
  { href: "/admin/blog", label: "Blog", glyph: glyphs.blog },
  { href: "/admin/faq", label: "FAQ", glyph: glyphs.faq },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="mt-6 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        // Exact match for the index, prefix for the rest. A plain
        // `startsWith` would light up Overview on every page, since every
        // admin path begins with /admin.
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);

        return (
          <FastLink
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[0.8125rem] transition-colors duration-300 ${
              active
                ? "nav-pill-active"
                : "text-muted hover:bg-overlay hover:text-ink"
            }`}
          >
            <Icon glyph={tab.glyph} size="sm" />
            {tab.label}
          </FastLink>
        );
      })}
    </nav>
  );
}
