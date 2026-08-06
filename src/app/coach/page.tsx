import { requireCoach } from "@/lib/auth/dal";
import { classWindow, formatClassTime } from "@/lib/classes";
import { createClient } from "@/lib/supabase/server";
import { IconBadge, IconLabel } from "@/components/ui/Icon";
import { glyphs } from "@/components/ui/glyphs";
// One IST formatter, not two. This page had its own copy built on
// Intl.formatToParts; lib/schedule does the same job with arithmetic and is
// what the admin edit form already uses.
import { toIstLocalInput } from "@/lib/schedule";
import ClassRow from "./ClassRow";
import ScheduleForm from "./ScheduleForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const coach = await requireCoach();

  // Their own classes only. The filter is here for clarity and in the RLS
  // policy for enforcement — an admin viewing this page would otherwise see
  // everyone's, since the admin policy lets them read all of them.
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("trainer_id", coach.id)
    .order("scheduled_at", { ascending: true });

  // The coach's own groups, with roster sizes, so the schedule form can offer
  // them as targets.
  const { data: myGroups } = await supabase
    .from("training_groups")
    .select("id, name, kind")
    .eq("trainer_id", coach.id)
    .eq("active", true)
    .order("name", { ascending: true });

  const { data: rosterRows } = (myGroups ?? []).length
    ? await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", (myGroups ?? []).map((group) => group.id))
    : { data: [] };

  const counts = new Map<string, number>();
  for (const row of rosterRows ?? []) {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }

  const now = new Date();
  const all = classes ?? [];

  // Upcoming ascending (the next one first, which is what a coach is looking
  // for), past descending (the most recent first, for the same reason).
  const upcoming = all.filter(
    (c) =>
      c.status !== "cancelled" &&
      classWindow(c, now) !== "ended",
  );
  const past = all
    .filter((c) => c.status === "cancelled" || classWindow(c, now) === "ended")
    .reverse();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display-sm text-[1.75rem] text-ink">Your schedule</h1>
        <Link href="/coach/groups" className="link label">
          Your groups &rarr;
        </Link>
      </div>
      <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
        Anything you add here goes straight onto members&rsquo; dashboards and
        is yours to run. There is no room to set up — it opens itself when the
        first person joins.
      </p>

      <section className="mt-10">
        <ScheduleForm
          groups={(myGroups ?? []).map((group) => ({
            id: group.id,
            name: group.name,
            kind: group.kind,
            memberCount: counts.get(group.id) ?? 0,
          }))}
        />
      </section>

      <section className="mt-16">
        <IconLabel glyph={glyphs.upcoming}>
          Coming up{upcoming.length > 0 ? ` · ${upcoming.length}` : ""}
        </IconLabel>

        {upcoming.length === 0 ? (
          <div className="mt-6 flex items-start gap-4">
            <IconBadge glyph={glyphs.nothingScheduled} />
            <p className="max-w-md text-[0.9375rem] leading-relaxed text-muted">
              Nothing scheduled. Add your first session above.
            </p>
          </div>
        ) : (
          <ul className="mt-6">
            {upcoming.map((item) => (
              <ClassRow
                key={item.id}
                fitnessClass={item}
                window={classWindow(item, now)}
                formattedTime={formatClassTime(item.scheduled_at)}
                localDateTime={toIstLocalInput(new Date(item.scheduled_at))}
              />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-16">
          <IconLabel glyph={glyphs.membership}>Done</IconLabel>
          <ul className="mt-6">
            {past.slice(0, 20).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-line py-4"
              >
                <span className="text-[0.9375rem] text-muted">
                  {item.title}
                </span>
                <span className="label flex items-center gap-4 text-faint">
                  <span className="numeric">
                    {formatClassTime(item.scheduled_at)}
                  </span>
                  <span>{item.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
