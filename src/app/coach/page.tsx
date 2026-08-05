import { requireCoach } from "@/lib/auth/dal";
import { classWindow, formatClassTime } from "@/lib/classes";
import { createClient } from "@/lib/supabase/server";
import ClassRow from "./ClassRow";
import ScheduleForm from "./ScheduleForm";

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
      <h1 className="display-sm text-[1.75rem] text-ink">Your schedule</h1>
      <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-muted">
        Anything you add here goes straight onto members&rsquo; dashboards and
        is yours to run. There is no room to set up — it opens itself when the
        first person joins.
      </p>

      <section className="mt-10">
        <ScheduleForm />
      </section>

      <section className="mt-16">
        <h2 className="label text-faint">
          Coming up{upcoming.length > 0 ? ` · ${upcoming.length}` : ""}
        </h2>

        {upcoming.length === 0 ? (
          <p className="mt-6 text-[0.9375rem] leading-relaxed text-muted">
            Nothing scheduled. Add your first session above.
          </p>
        ) : (
          <ul className="mt-6">
            {upcoming.map((item) => (
              <ClassRow
                key={item.id}
                fitnessClass={item}
                window={classWindow(item, now)}
                formattedTime={formatClassTime(item.scheduled_at)}
                localDateTime={toLocalInputValue(item.scheduled_at)}
              />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-16">
          <h2 className="label text-faint">Done</h2>
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

/**
 * An ISO timestamp as `YYYY-MM-DDTHH:mm` for a datetime-local input.
 *
 * Rendered in IST rather than the server's UTC: the input has no timezone of
 * its own, so whatever string goes in is read back as the browser's local
 * time. Coaches and members are both in India, so IST is the one reading that
 * makes the edit form show the same time the schedule above it just did.
 */
function toLocalInputValue(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).formatToParts(new Date(iso));

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
