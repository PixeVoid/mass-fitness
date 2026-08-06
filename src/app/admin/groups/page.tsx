import { setGroupActive } from "@/app/actions/adminGroups";
import { requireAdmin } from "@/lib/auth/dal";
import { listTrainers } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import CoachCapacityForm from "./CoachCapacityForm";
import GroupForm from "./GroupForm";
import { IconLabel } from "@/components/ui/Icon";
import { glyphs } from "@/components/ui/glyphs";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  await requireAdmin();

  const supabase = createAdminClient();
  const [{ data: groups }, trainers] = await Promise.all([
    supabase
      .from("training_groups")
      .select("*")
      .order("kind", { ascending: true })
      .order("name", { ascending: true }),
    listTrainers(),
  ]);

  const { data: rosterRows } = (groups ?? []).length
    ? await supabase.from("group_members").select("group_id")
    : { data: [] };

  const counts = new Map<string, number>();
  for (const row of rosterRows ?? []) {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }

  const trainerNames = new Map(trainers.map((t) => [t.id, t.name ?? t.email]));
  const shared = (groups ?? []).filter((g) => g.kind === "group");
  const oneToOne = (groups ?? []).filter((g) => g.kind === "one_to_one");

  return (
    <>
      <h1 className="display-sm text-[1.75rem] text-ink">Groups</h1>
      <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
        A group is a cohort with one coach and a hard cap. Members pick one
        straight after paying, and a full group stops being offered. One-to-one
        cohorts create themselves when a member picks a coach — they are not
        made here.
      </p>

      <section className="mt-10">
        <GroupForm trainers={trainers} />
      </section>

      <section className="mt-16">
        <IconLabel glyph={glyphs.groups}>Shared groups</IconLabel>
        {shared.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">
            None yet. Members who pay before a group exists land on a page
            telling them to message you, so create at least one first.
          </p>
        ) : (
          <ul className="mt-6">
            {shared.map((group) => {
              const taken = counts.get(group.id) ?? 0;
              return (
                <li
                  key={group.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-t border-line py-5"
                >
                  <div className="min-w-0">
                    <p className="text-[1.0625rem] text-ink">
                      {group.name}
                      {!group.active && (
                        <span className="label ml-3 text-faint">retired</span>
                      )}
                    </p>
                    <p className="mt-1 text-[0.8125rem] text-faint">
                      {group.focus}
                      {group.trainer_id
                        ? ` · ${trainerNames.get(group.trainer_id) ?? "unknown coach"}`
                        : " · no coach"}
                      {group.schedule_hint ? ` · ${group.schedule_hint}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-5">
                    <span className="label numeric text-faint">
                      {taken} / {group.capacity}
                    </span>
                    <form action={setGroupActive}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={group.active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="link text-[0.8125rem] text-faint"
                      >
                        {group.active ? "Retire" : "Reopen"}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-16">
        <IconLabel glyph={glyphs.capacity}>One-to-one capacity</IconLabel>
        <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
          How many private clients each coach will take. Zero means they are
          not offered to anyone choosing a one-to-one plan — which is the
          default, so a new trainer never becomes bookable by accident.
        </p>

        <ul className="mt-8">
          {trainers.map((trainer) => {
            const clients = oneToOne.filter(
              (group) => group.trainer_id === trainer.id && group.active,
            ).length;
            return (
              <li
                key={trainer.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line py-5"
              >
                <div>
                  <p className="text-[0.9375rem] text-ink">
                    {trainer.name ?? trainer.email ?? trainer.id}
                  </p>
                  <p className="label mt-1 text-faint">
                    {clients} client{clients === 1 ? "" : "s"} now
                  </p>
                </div>
                <CoachCapacityForm
                  userId={trainer.id}
                  capacity={trainer.one_to_one_capacity}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
