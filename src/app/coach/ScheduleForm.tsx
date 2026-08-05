"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { scheduleOwnClass, type CoachState } from "@/app/actions/coach";

/**
 * Schedule a session.
 *
 * No trainer picker — the class is always the caller's, decided server-side.
 * No members-only toggle either: giving a session away free is a pricing
 * decision, and pricing lives with admins.
 */
export default function ScheduleForm() {
  const [state, action] = useActionState<CoachState, FormData>(
    scheduleOwnClass,
    {},
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
