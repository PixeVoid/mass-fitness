import { cancelSeries } from "@/app/actions/admin";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { listAllClasses, listTargetableGroups, listTrainers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { formatClassTime } from "@/lib/classes";
import { groupClassSeries } from "@/lib/classSeries";
import ClassForm from "./ClassForm";
import ClassRow from "./ClassRow";
import { started } from "@/lib/promises";

export const dynamic = "force-dynamic";

export default async function AdminClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  // The queries start before the auth check rather than after it. They run on
  // the *user's* client, so RLS is what actually decides what comes back — an
  // impostor gets empty results — and `requireAdmin()` still refuses the
  // render below. Awaiting auth first simply spent two round trips before
  // asking for anything, which is the whole of the tab-switch delay.
  const dataPromise = started(
    Promise.all([
    searchParams,
    listAllClasses(),
    listTrainers(),
      listTargetableGroups(),
    ]),
  );

  await requireAdmin();
  const [{ cancelled }, classes, trainers, groups] = await dataPromise;

  const layout = groupClassSeries(classes);

  return (
    <>
      <h1 className="display-sm text-[1.75rem] text-ink">Classes</h1>
      <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
        Scheduling a class is all that is needed — LiveKit creates the room
        itself when the first person joins, so there is nothing to provision on
        their side. Times are IST.
      </p>

      {cancelled === "series" && (
        <p
          role="status"
          className="mt-6 border-l border-line-strong pl-5 text-[0.9375rem] text-ink"
        >
          The remaining sessions in that routine are cancelled. Ones that
          already ran were left alone.
        </p>
      )}

      <div className="mt-10">
        <ClassForm trainers={trainers} groups={groups} />
      </div>

      <section className="mt-14">
        <h2 className="label text-faint">Schedule</h2>

        {classes.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">No classes yet.</p>
        ) : (
          <ul className="mt-6">
            {layout.map((entry) => {
              if (entry.kind === "single") {
                return (
                  <ClassRow
                    key={entry.item.id}
                    fitnessClass={entry.item}
                    trainers={trainers}
                  />
                );
              }

              const group = entry.series;
              const first = group.sessions[0];
              const last = group.sessions[group.sessions.length - 1];

              return (
                <li key={group.id} className="border-t border-line">
                  {/* <details> rather than state: this is disclosure, not
                      interactivity, and the browser does it without shipping
                      a component or losing the open one on navigation. */}
                  <details className="group">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5">
                      <span>
                        <span className="text-[0.9375rem] text-ink">
                          {group.title}
                        </span>
                        <span className="pick-badge ml-3">
                          {group.sessions.length} sessions
                        </span>
                      </span>

                      <span className="label flex flex-wrap items-center gap-x-4 gap-y-2 text-faint">
                        <span className="numeric">
                          {formatClassTime(first.scheduled_at)}
                        </span>
                        <span aria-hidden="true">&rarr;</span>
                        <span className="numeric">
                          {formatClassTime(last.scheduled_at)}
                        </span>
                        <span className="text-ink group-open:hidden">Show</span>
                        <span className="hidden text-ink group-open:inline">
                          Hide
                        </span>
                      </span>
                    </summary>

                    <div className="border-l border-line pb-5 pl-5">
                      <ul>
                        {group.sessions.map((session) => (
                          <ClassRow
                            key={session.id}
                            fitnessClass={session}
                            trainers={trainers}
                          />
                        ))}
                      </ul>

                      {group.upcoming > 0 && (
                        <div className="mt-5">
                          <ConfirmSubmit
                            action={cancelSeries}
                            fields={{ seriesId: group.id }}
                            label="Cancel the rest of this routine"
                            confirmLabel={`Cancel ${group.upcoming} sessions`}
                            title="Cancel the remaining sessions?"
                            body={`${group.upcoming} upcoming ${
                              group.upcoming === 1 ? "session" : "sessions"
                            } of "${group.title}" will be marked cancelled. Sessions that already ran are left alone, and members will see them marked off.`}
                          />
                        </div>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
