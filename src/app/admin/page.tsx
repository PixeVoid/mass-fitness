import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getAdminStats, listMembers } from "@/lib/admin/queries";
import { formatClassTime } from "@/lib/classes";
import { started } from "@/lib/promises";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  // The queries start before the auth check rather than after it. They run on
  // the *user's* client, so RLS is what actually decides what comes back — an
  // impostor gets empty results — and `requireAdmin()` still refuses the
  // render below. Awaiting auth first simply spent two round trips before
  // asking for anything, which is the whole of the tab-switch delay.
  const statsPromise = started(getAdminStats());
  const membersPromise = started(listMembers(8));

  await requireAdmin();
  const [stats, members] = await Promise.all([statsPromise, membersPromise]);

  return (
    <>
      <dl className="grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-4">
        <Stat label="Signups" value={stats.members} />
        <Stat label="Active memberships" value={stats.activeMembers} />
        <Stat label="Upcoming classes" value={stats.upcomingClasses} />
        <Stat label="Self-assessment leads" value={stats.newLeads} />
      </dl>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="label text-faint">Latest signups</h2>
          <Link href="/admin/members" className="link text-[0.8125rem]">
            All members
          </Link>
        </div>

        {members.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">
            No signups yet.
          </p>
        ) : (
          <ul className="mt-6">
            {members.map(({ profile, subscription }) => (
              <li
                key={profile.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-line py-4"
              >
                <div>
                  <p className="text-[0.9375rem] text-ink">
                    {profile.name ?? "—"}
                    {profile.role !== "member" && (
                      <span className="label ml-3 text-faint">
                        {profile.role}
                      </span>
                    )}
                  </p>
                  <p className="numeric mt-1 text-[0.8125rem] text-faint">
                    {profile.email ?? "no email"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="label text-faint">
                    {subscription?.status === "active" ? "Active" : "No plan"}
                  </p>
                  <p className="numeric mt-1 text-[0.8125rem] text-faint">
                    {formatClassTime(profile.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper p-6 sm:p-8">
      <dt className="label text-faint">{label}</dt>
      <dd className="numeric mt-4 text-4xl tracking-tight text-ink">{value}</dd>
    </div>
  );
}
