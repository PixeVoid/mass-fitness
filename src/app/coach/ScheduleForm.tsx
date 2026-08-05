"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { scheduleOwnClass, type CoachState } from "@/app/actions/coach";

export interface CoachGroup {
  id: string;
  name: string;
  kind: "group" | "one_to_one";
  memberCount: number;
}

/**
 * Schedule a session.
 *
 * No trainer picker — the class is always the caller's, decided server-side.
 * No members-only toggle either: giving a session away free is a pricing
 * decision, and pricing lives with admins.
 */
export default function ScheduleForm({ groups }: { groups: CoachGroup[] }) {
  const [state, action] = useActionState<CoachState, FormData>(
    scheduleOwnClass,
    {},
  );
  // Defaults to the whole membership only when there is nothing to target.
  // With groups available, making the choice deliberate is the point — an
  // accidental "everyone" on a one-to-one is a private session made public.
  const [audience, setAudience] = useState<"all" | "groups">(
    groups.length > 0 ? "groups" : "all",
  );

  return (
    <form
      action={action}
      className="panel grid grid-cols-1 gap-5 rounded-2xl p-6 sm:grid-cols-2 sm:p-8"
    >
      <div className="sm:col-span-2">
        <label htmlFor="title" className="field-label">
          What are you running?
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
          className="field"
        />
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-faint">
          Your device&apos;s timezone. Members always see it in IST.
        </p>
      </div>

      <div>
        <label htmlFor="durationMinutes" className="field-label">
          Length (minutes)
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

      <fieldset className="sm:col-span-2">
        <legend className="field-label">Who is it for?</legend>
        <div className="mt-2 flex flex-col gap-3">
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

        {audience === "groups" && (
          <div className="mt-5 flex flex-col gap-3 border-l border-line pl-5">
            {groups.length === 0 ? (
              <p className="text-[0.8125rem] leading-relaxed text-faint">
                You have no groups yet — an admin creates them and assigns you.
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
                    {group.kind === "one_to_one"
                      ? "one-to-one"
                      : `${group.memberCount} member${group.memberCount === 1 ? "" : "s"}`}
                  </span>
                </label>
              ))
            )}
          </div>
        )}
      </fieldset>

      <div className="sm:col-span-2">
        <Submit />
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-faint">
          The room opens 20 minutes early so you can set up, and stays open 20
          minutes past the end for anyone reconnecting. Members get an email
          shortly before it starts.
        </p>
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
      {pending ? "Scheduling…" : "Add to the schedule"}
    </button>
  );
}
