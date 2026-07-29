import { listMembers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { getPlans } from "@/lib/pricing";
import MemberRow from "./MemberRow";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  await requireAdmin();
  const [members, plans] = await Promise.all([listMembers(), getPlans()]);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display-sm text-[1.75rem] text-ink">Members</h1>
        <p className="label text-faint">{members.length} shown</p>
      </div>

      <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
        Until PhonePe checkout ships, this is where memberships are granted —
        record what was actually collected over UPI or in cash. Granting is
        additive, so a member&apos;s history is kept rather than overwritten.
      </p>

      {members.length === 0 ? (
        <p className="mt-10 text-[0.9375rem] text-muted">
          Nobody has signed up yet.
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
