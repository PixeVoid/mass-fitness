import { listAllClasses, listTrainers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { formatClassTime } from "@/lib/classes";
import ClassForm from "./ClassForm";
import StatusForm from "./StatusForm";

export const dynamic = "force-dynamic";

export default async function AdminClassesPage() {
  await requireAdmin();
  const [classes, trainers] = await Promise.all([
    listAllClasses(),
    listTrainers(),
  ]);

  const trainerNames = new Map(
    trainers.map((trainer) => [trainer.id, trainer.name ?? trainer.phone ?? "—"]),
  );

  return (
    <>
      <h1 className="display-sm text-[1.75rem] text-ink">Classes</h1>
      <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
        Scheduling a class is all that is needed — LiveKit creates the room
        itself when the first person joins, so there is nothing to provision on
        their side.
      </p>

      <div className="mt-10">
        <ClassForm trainers={trainers} />
      </div>

      <section className="mt-14">
        <h2 className="label text-faint">Schedule</h2>

        {classes.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-muted">
            No classes yet.
          </p>
        ) : (
          <ul className="mt-6">
            {classes.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-1 items-baseline gap-x-6 gap-y-3 border-t border-line py-5 lg:grid-cols-12"
              >
                <div className="lg:col-span-5">
                  <p className="text-[0.9375rem] text-ink">
                    {item.title}
                    {!item.is_premium && (
                      <span className="label ml-3 text-faint">free</span>
                    )}
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-faint">
                    {item.trainer_id
                      ? `with ${trainerNames.get(item.trainer_id) ?? "unknown"}`
                      : "no trainer assigned"}
                  </p>
                </div>

                <div className="label flex flex-wrap items-center gap-x-4 gap-y-2 text-faint lg:col-span-4">
                  <span className="numeric">
                    {formatClassTime(item.scheduled_at)}
                  </span>
                  <span className="numeric">{item.duration_minutes} min</span>
                </div>

                <div className="lg:col-span-3 lg:justify-self-end">
                  <StatusForm classId={item.id} status={item.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
