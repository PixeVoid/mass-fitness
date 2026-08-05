import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

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

/**
 * The layout gate is a convenience, not the boundary. Layouts do not re-render
 * on every navigation, and Server Actions bypass them entirely — so each page
 * and each action calls `requireAdmin()` itself.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="label text-faint">Mass Fitness admin</p>
          <p className="mt-2 text-[0.9375rem] text-muted">
            {admin.name ?? "Admin"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn btn-outline">
            Member view
          </Link>
          <form action={signOut}>
            <button type="submit" className="btn btn-outline">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <nav aria-label="Admin sections" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-full px-4 py-2 text-[0.8125rem] text-muted transition-colors hover:bg-overlay hover:text-ink"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <main className="mt-10">{children}</main>
    </div>
  );
}
