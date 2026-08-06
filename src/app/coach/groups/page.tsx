import Link from "next/link";
import { requireCoach } from "@/lib/auth/dal";
import { getAssessmentsForMembers, getRecentJoins } from "@/lib/groups";
import { formatClassTime } from "@/lib/classes";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * A coach's groups, their rosters, and who has just arrived.
 *
 * The new-member list is derived from `group_members.joined_at` rather than
 * from a notifications table. There is nothing here a timestamp cannot answer,
 * and an unread flag would be a second source of truth about a fact the
 * roster already states.
 *
 * Reads with the service role because a roster spans other people's profiles.
 * `requireCoach()` plus the `trainer_id` filter below is what scopes it — the
 * RLS roster policy covers the same ground for anything reading as the user.
 */
export default async function CoachGroupsPage() {
  const coach = await requireCoach();
  const supabase = createAdminClient();

  const [{ data: groups }, recentJoins] = await Promise.all([
    supabase
      .from("training_groups")
      .select("*")
      .eq("trainer_id", coach.id)
      .order("kind", { ascending: true })
      .order("name", { ascending: true }),
    getRecentJoins(coach.id),
  ]);

  // Shown here as well as emailed. Coaches were told to go and find a message
  // from days ago, which is not where anyone looks before a session.
  const assessments = await getAssessmentsForMembers(
    recentJoins.map((member) => member.email),
  );

  const rosters = new Map<string, { name: string | null; joinedAt: string }[]>();
  if (groups && groups.length > 0) {
    const { data: members } = await supabase
      .from("group_members")
      .select("group_id, user_id, joined_at")
      .in(
        "group_id",
        groups.map((group) => group.id),
      );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", (members ?? []).map((member) => member.user_id));

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

    for (const member of members ?? []) {
      const list = rosters.get(member.group_id) ?? [];
      list.push({
        name: nameById.get(member.user_id) ?? null,
        joinedAt: member.joined_at,
      });
      rosters.set(member.group_id, list);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display-sm text-[1.75rem] text-ink">Your groups</h1>
        <Link href="/coach" className="link label">
          Schedule &rarr;
        </Link>
      </div>

      {recentJoins.length > 0 && (
        <section className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="label text-faint">New in the last two weeks</h2>
          <ul className="mt-6 flex flex-col gap-5">
            {recentJoins.map((member) => (
              <li key={`${member.userId}-${member.joinedAt}`}>
                <p className="text-[1.0625rem] text-ink">
                  {member.name ?? "New member"}
                  <span className="text-faint"> · {member.groupName}</span>
                </p>
                {member.fitnessGoal && (
                  <p className="mt-1 text-[0.9375rem] text-muted">
                    Training for: {member.fitnessGoal}
                  </p>
                )}

                {(() => {
                  const assessment = member.email
                    ? assessments.get(member.email.toLowerCase())
                    : undefined;
                  if (!assessment) return null;
                  return (
                    <p className="mt-2 text-[0.9375rem] text-muted">
                      <span className="numeric text-ink">
                        {assessment.score ?? "—"}/100
                      </span>
                      {assessment.band ? ` · ${assessment.band}` : ""}
                      {assessment.summary ? ` — ${assessment.summary}` : ""}
                    </p>
                  );
                })()}

                <p className="label mt-2 text-faint">
                  <span className="numeric">
                    {formatClassTime(member.joinedAt)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[0.8125rem] leading-relaxed text-faint">
            Self-assessment scores are shown with the member&rsquo;s consent,
            given when they took the quiz. Treat them as confidential — this is
            health information about someone you are about to coach.
          </p>
        </section>
      )}

      <section className="mt-14">
        {!groups || groups.length === 0 ? (
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            You don&rsquo;t have any groups yet. An admin creates them and
            assigns you — one-to-one groups appear here on their own when a
            member picks you.
          </p>
        ) : (
          <ul className="flex flex-col">
            {groups.map((group) => {
              const roster = rosters.get(group.id) ?? [];
              return (
                <li key={group.id} className="border-t border-line py-8 first:border-t-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <div>
                      <h2 className="display-sm text-[1.375rem] text-ink">
                        {group.name}
                      </h2>
                      <p className="mt-1.5 text-[0.9375rem] text-muted">
                        {group.focus}
                        {group.schedule_hint ? ` · ${group.schedule_hint}` : ""}
                      </p>
                    </div>
                    <span className="label text-faint">
                      {roster.length} of {group.capacity}
                      {group.kind === "one_to_one" ? " · one-to-one" : ""}
                    </span>
                  </div>

                  {roster.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                      {roster.map((member, i) => (
                        <li key={i} className="text-[0.9375rem] text-muted">
                          {member.name ?? "Member"}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
