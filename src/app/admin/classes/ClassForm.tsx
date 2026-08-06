"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClass, type ActionState } from "@/app/actions/admin";
import type { Profile } from "@/lib/db-types";
import { personOptionLabel } from "@/lib/people";
import Icon from "@/components/ui/Icon";
import { glyphs } from "@/components/ui/glyphs";
import {
  MAX_WEEKS,
  WEEKDAY_LABELS,
  describeWeekdays,
  istWeekday,
  parseIstLocal,
  type Weekday,
} from "@/lib/schedule";

export interface TargetableGroup {
  id: string;
  name: string;
  kind: "group" | "one_to_one";
  trainerName: string | null;
}

export default function ClassForm({
  trainers,
  groups,
}: {
  trainers: Profile[];
  groups: TargetableGroup[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(createClass, {});
  const [audience, setAudience] = useState<"all" | "groups">("all");
  const [repeats, setRepeats] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [days, setDays] = useState<Weekday[]>([]);
  const [startsAt, setStartsAt] = useState("");

  // The day the admin picked is always part of the routine, so it is shown as
  // ticked and cannot be unticked — a Mon/Wed/Fri box that excluded the Monday
  // just chosen would be lying about what is being created.
  const pickedDay = startsAt ? istWeekday(parseIstLocal(startsAt) ?? new Date()) : null;
  const allDays: Weekday[] =
    pickedDay === null ? days : [...new Set<Weekday>([pickedDay, ...days])];
  const total = repeats ? allDays.length * weeks : 1;

  function toggleDay(day: Weekday) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day],
    );
  }

  return (
    <form
      action={action}
      className="panel grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 sm:p-8"
    >
      <div className="sm:col-span-2">
        <label htmlFor="title" className="field-label">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          placeholder="Morning Strength"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="scheduledAt" className="field-label">
          Date and time
        </label>
        <input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          required
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          className="field"
        />
        {/* It used to say "your device's timezone", which was wrong twice
            over: the value has no zone, and the server was reading it in its
            own — UTC in production, so 7:00am became 12:30pm to members. */}
        <p className="mt-2 text-[0.8125rem] text-faint">
          India Standard Time, the same clock members see.
        </p>
      </div>

      <div>
        <label htmlFor="durationMinutes" className="field-label">
          Duration (minutes)
        </label>
        <input
          id="durationMinutes"
          name="durationMinutes"
          type="number"
          inputMode="numeric"
          min={5}
          max={240}
          defaultValue={45}
          required
          className="field numeric"
        />
      </div>

      <div>
        <label htmlFor="trainerId" className="field-label">
          Trainer
        </label>
        <select id="trainerId" name="trainerId" defaultValue="" className="field">
          <option value="">Unassigned</option>
          {trainers.map((trainer) => (
            <option key={trainer.id} value={trainer.id}>
              {personOptionLabel(trainer)}
            </option>
          ))}
        </select>
        {trainers.length === 0 && (
          // Without this the empty dropdown looks like a bug rather than a
          // step nobody has done yet.
          <p className="mt-2 text-[0.8125rem] text-faint">
            Nobody has the trainer role yet — set one on the Members tab.
          </p>
        )}
      </div>

      <div className="flex items-end">
        <label className="flex items-center gap-3 text-[0.9375rem] text-muted">
          <input
            type="checkbox"
            name="isPremium"
            defaultChecked
            className="h-5 w-5 accent-[color:var(--ink)]"
          />
          Members only
        </label>
      </div>

      <fieldset className="sm:col-span-2 border-t border-line pt-5">
        <legend className="field-label">Who is it for?</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-3">
          <label className="flex items-center gap-3 text-[0.9375rem] text-ink">
            <input
              type="radio"
              name="audience"
              value="all"
              checked={audience === "all"}
              onChange={() => setAudience("all")}
              className="h-4 w-4 accent-[color:var(--ink)]"
            />
            Every member
          </label>
          <label className="flex items-center gap-3 text-[0.9375rem] text-ink">
            <input
              type="radio"
              name="audience"
              value="groups"
              checked={audience === "groups"}
              onChange={() => setAudience("groups")}
              disabled={groups.length === 0}
              className="h-4 w-4 accent-[color:var(--ink)]"
            />
            Specific groups
          </label>
        </div>

        {/* "Every member" excludes one-to-one members by design — their plan
            buys private sessions only. To reach one, target their group. */}
        {audience === "groups" && (
          <div className="mt-5 flex flex-col gap-3 border-l border-line pl-5">
            {groups.length === 0 ? (
              <p className="text-[0.8125rem] leading-relaxed text-faint">
                No groups yet — create one on the Groups tab.
              </p>
            ) : (
              groups.map((group) => (
                <label
                  key={group.id}
                  className="flex items-center gap-3 text-[0.9375rem] text-muted"
                >
                  <input
                    type="checkbox"
                    name="groupIds"
                    value={group.id}
                    className="h-4 w-4 accent-[color:var(--ink)]"
                  />
                  {group.name}
                  <span className="label text-faint">
                    {group.kind === "one_to_one" ? "one-to-one" : group.trainerName ?? "no coach"}
                  </span>
                </label>
              ))
            )}
          </div>
        )}
      </fieldset>

      {/* Repeating routine. A timetable is the same session on the same days
          every week, and entering those one at a time is the chore that stops
          the schedule being kept up to date at all. */}
      <fieldset className="sm:col-span-2 border-t border-line pt-5">
        <label className="flex items-center gap-3 text-[0.9375rem] text-ink">
          <input
            type="checkbox"
            checked={repeats}
            onChange={(event) => setRepeats(event.target.checked)}
            className="h-5 w-5 accent-[color:var(--ink)]"
          />
          <Icon glyph={glyphs.repeating} size="md" className="text-muted" />
          Repeat this every week
        </label>

        {repeats && (
          <div className="mt-5 flex flex-col gap-5 border-l border-line pl-5">
            <div>
              <p className="field-label">Days</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((day) => {
                  const isPicked = day.value === pickedDay;
                  const on = allDays.includes(day.value);

                  return (
                    <label
                      key={day.value}
                      title={
                        isPicked
                          ? "The day you picked above — always included"
                          : day.long
                      }
                      className={`pick cursor-pointer rounded-full border border-line px-4 py-2 text-[0.8125rem] ${
                        on ? "pick-selected" : "text-muted"
                      } ${isPicked ? "cursor-default opacity-90" : ""}`}
                    >
                      <input
                        type="checkbox"
                        name="repeatDays"
                        value={day.value}
                        checked={on}
                        disabled={isPicked}
                        onChange={() => toggleDay(day.value)}
                        className="sr-only"
                      />
                      {day.short}
                    </label>
                  );
                })}
              </div>
              {pickedDay === null && (
                <p className="mt-2 text-[0.8125rem] text-faint">
                  Pick a date and time first — its day is always included.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="repeatWeeks" className="field-label">
                For how many weeks
              </label>
              <input
                id="repeatWeeks"
                name="repeatWeeks"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_WEEKS}
                value={weeks}
                onChange={(event) =>
                  setWeeks(Math.max(1, Math.min(MAX_WEEKS, Number(event.target.value) || 1)))
                }
                className="field numeric w-28 !py-3 text-center !text-[1.125rem]"
              />
            </div>

            {/* Says exactly what the button will create. Bulk-creating rows
                from a form is the kind of thing that should never be a
                surprise — every one of these becomes a session members see. */}
            <p className="text-[0.9375rem] text-ink">
              Creates <span className="numeric">{total}</span>{" "}
              {total === 1 ? "session" : "sessions"}
              {allDays.length > 0 && ` — ${describeWeekdays(allDays)}`}, for{" "}
              <span className="numeric">{weeks}</span>{" "}
              {weeks === 1 ? "week" : "weeks"}.
            </p>
          </div>
        )}

        {/* Sent only when repeating, so a one-off posts nothing extra. */}
        {!repeats && <input type="hidden" name="repeatWeeks" value={1} />}
      </fieldset>

      <div className="sm:col-span-2">
        <Submit />
        {state.error && (
          <p role="alert" className="field-error">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="mt-2 text-[0.8125rem] text-muted">
            {state.success}
          </p>
        )}
      </div>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-solid w-full disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Scheduling…" : "Schedule class"}
    </button>
  );
}
