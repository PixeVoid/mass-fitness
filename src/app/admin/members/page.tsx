import Link from "next/link";
import { listMembers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { getPlans } from "@/lib/pricing";
import MemberRow from "./MemberRow";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [members, plans] = await Promise.all([
    listMembers(100, query || undefined),
    getPlans(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="display-sm text-[1.75rem] text-ink">Members</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* The list is capped at 100 rows. Past that, scrolling is not a
              way to find anyone — this is. */}
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="members-search" className="sr-only">
              Search members by name or email
            </label>
            <input
              id="members-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search name or email"
              className="field !py-2 w-52 !text-[0.8125rem] sm:w-64"
            />
            <button
              type="submit"
              className="btn btn-outline !px-4 !py-2 !text-[0.8125rem]"
            >
              Search
            </button>
            {query && (
              <Link
                href="/admin/members"
                className="link text-[0.8125rem] text-faint"
              >
                Clear
              </Link>
            )}
          </form>

          <p className="label text-faint">{members.length} shown</p>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
        Until PhonePe checkout ships, this is where memberships are granted —
        record what was actually collected over UPI or in cash. Granting is
        additive, so a member&apos;s history is kept rather than overwritten.
      </p>

      {members.length === 0 ? (
        <p className="mt-10 text-[0.9375rem] text-muted">
          {query ? "Nobody matches that." : "Nobody has signed up yet."}
        </p>
      ) : (
        <ul className="mt-10">
          {members.map(({ profile, subscription }) => (
            <MemberRow
              key={profile.id}
              profile={profile}
              subscription={subscription}
              plans={plans}
            />
          ))}
        </ul>
      )}
    </>
  );
}
