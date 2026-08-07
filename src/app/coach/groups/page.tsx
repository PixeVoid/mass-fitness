import { requireCoach } from "@/lib/auth/dal";
import { getAssessmentsForMembers, recentJoins } from "@/lib/groups";
import { formatClassTime } from "@/lib/classes";
import { createAdminClient } from "@/lib/supabase/admin";
import Icon, { IconBadge, IconLabel } from "@/components/ui/Icon";
import { glyphs } from "@/components/ui/glyphs";
import FastLink from "@/components/ui/FastLink";

export const dynamic = "force-dynamic";

/**
 * A coach's groups, their rosters, and who has just arrived.
 *
 * This page was seven sequential round trips: the profile, then the groups,
 * then `getRecentJoins` (which fetched the same groups again, then the
 * memberships, then the profiles), then the assessments, then the memberships
 * *again*, then the profiles again. At a hundred-odd milliseconds each that is
 * most of a second spent waiting, and it is what "Your groups takes too long"
 * actually was.
 *
 * It is four now, and two of those are unavoidable — you cannot ask which
 * groups are yours before knowing who you are. The roster query carries its
 * profiles with it through an embedded select rather than fetching ids and
 * then looking them up, and the "new this fortnight" list is derived from the
 * roster already in hand instead of being a second query with a date filter.
 *
 * Reads with the service role because a roster spans other people's profiles.
 * `requireCoach()` plus the `trainer_id` filter is what scopes it.
 */
export default async function CoachGroupsPage() {
  const coach = await requireCoach();
  const supabase = createAdminClient();

  const { data: groups } = await supabase
    .from("training_groups")
    .select("*")
    .eq("trainer_id", coach.id)
    .order("kind", { ascending: true })
    .order("name", { ascending: true });

  const groupIds = (groups ?? []).map((group) => group.id);
  const names = new Map((groups ?? []).map((group) => [group.id, group.name]));

  // One query for the whole page's people. The embedded `profiles(...)` is a
  // join executed in Postgres, so the names arrive with the memberships
  // instead of costing a second trip to look up ids we already have.
  const { data: memberships } = groupIds.length
    ? await supabase
        .from("group_members")
        .select(
          "group_id, user_id, joined_at, profiles(id, name, email, fitness_goal)",
        )
        .in("group_id", groupIds)
        .order("joined_at", { ascending: false })
    : { data: [] };

  const rows = memberships ?? [];

  // Derived from the rows already fetched rather than re-queried with a date
  // filter. A coach's rosters are tens of people, not thousands.
  const arrivals = recentJoins(rows);

  const assessments = await getAssessmentsForMembers(
    arrivals.map((row) => row.profiles?.email ?? null),
  );

  const rosters = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = rosters.get(row.group_id) ?? [];
    list.push(row);
    rosters.set(row.group_id, list);
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display-sm text-[1.75rem] text-ink">Your groups</h1>
        <FastLink href="/coach" className="link label flex items-center gap-2">
          <Icon glyph={glyphs.schedule} size="sm" />
          Schedule &rarr;
        </FastLink>
      </div>

      {arrivals.length > 0 && (
        <section className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <IconLabel glyph={glyphs.newMember}>
            New in the last two weeks
          </IconLabel>
          <ul className="mt-6 flex flex-col gap-5">
            {arrivals.map((row) => {
              const email = row.profiles?.email ?? null;
              const assessment = email
                ? assessments.get(email.toLowerCase())
                : undefined;

              return (
                <li key={`${row.user_id}-${row.joined_at}`}>
                  <p className="text-[1.0625rem] text-ink">
                    {row.profiles?.name ?? "New member"}
                    <span className="text-faint">
                      {" "}
                      · {names.get(row.group_id) ?? "—"}
                    </span>
                  </p>

                  {row.profiles?.fitness_goal && (
                    <p className="mt-1 flex items-center gap-2 text-[0.9375rem] text-muted">
                      <Icon glyph={glyphs.goal} size="sm" className="text-faint" />
                      Training for: {row.profiles.fitness_goal}
                    </p>
                  )}

                  {assessment && (
                    <p className="mt-2 flex items-center gap-2 text-[0.9375rem] text-muted">
                      <Icon
                        glyph={glyphs.assessment}
                        size="sm"
                        className="text-faint"
                      />
                      <span>
                        <span className="numeric text-ink">
                          {assessment.score ?? "—"}/100
                        </span>
                        {assessment.band ? ` · ${assessment.band}` : ""}
                        {assessment.summary ? ` — ${assessment.summary}` : ""}
                      </span>
                    </p>
                  )}

                  <p className="label mt-2 flex items-center gap-1.5 text-faint">
                    <Icon glyph={glyphs.time} size="sm" />
                    <span className="numeric">
                      {formatClassTime(row.joined_at)}
                    </span>
                  </p>
                </li>
              );
            })}
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
          <div className="flex items-start gap-4">
            <IconBadge glyph={glyphs.groups} />
            <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted">
              You don&rsquo;t have any groups yet. An admin creates them and
              assigns you — one-to-one groups appear here on their own when a
              member picks you.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {groups.map((group) => {
              const roster = rosters.get(group.id) ?? [];
              return (
                <li
                  key={group.id}
                  className="border-t border-line py-8 first:border-t-0"
                >
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
                    <span className="label flex items-center gap-1.5 text-faint">
                      <Icon glyph={glyphs.members} size="sm" />
                      {roster.length} of {group.capacity}
                      {group.kind === "one_to_one" ? " · one-to-one" : ""}
                    </span>
                  </div>

                  {roster.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                      {roster.map((row) => (
                        <li
                          key={row.user_id}
                          className="text-[0.9375rem] text-muted"
                        >
                          {row.profiles?.name ?? "Member"}
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
