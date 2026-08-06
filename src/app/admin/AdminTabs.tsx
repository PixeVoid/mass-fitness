"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The admin section nav, with a marker for where you are.
 *
 * A client component only because the current path is the whole point and a
 * layout on the server does not get one. It renders nothing but links, so the
 * cost is a few hundred bytes for the thing that stops every admin page
 * looking identical to every other admin page.
 */

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/faq", label: "FAQ" },
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
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-[0.8125rem] transition-colors duration-300 ${
              active
                ? "nav-pill-active"
                : "text-muted hover:bg-overlay hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
