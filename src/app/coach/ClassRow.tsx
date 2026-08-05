"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  setOwnClassStatus,
  updateOwnClass,
  type CoachState,
} from "@/app/actions/coach";
import type { ClassStatus, FitnessClass } from "@/lib/db-types";
import type { ClassWindow } from "@/lib/classes";

/**
 * One row on the coach's schedule: what it is, and the one or two things
 * worth doing to it right now.
 *
 * The controls are driven by where the class sits in time rather than by
 * offering everything always. Before it opens, the useful action is editing or
 * calling it off; once the door is open, it is joining. A cancel button next
 * to a class that finished last week is noise.
 */
export default function ClassRow({
  fitnessClass,
  window: classWindow,
  formattedTime,
  localDateTime,
}: {
  fitnessClass: FitnessClass;
  window: ClassWindow;
  /** Pre-formatted server-side in IST, so every viewer reads the same time. */
  formattedTime: string;
  /** Value for the datetime-local input, in the browser's own timezone. */
  localDateTime: string;
}) {
  const [editing, setEditing] = useState(false);
  const settled =
    fitnessClass.status === "cancelled" || fitnessClass.status === "ended";

  return (
    <li className="border-t border-line py-6 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h3 className="display-sm text-[1.25rem] text-ink">
            {fitnessClass.title}
          </h3>
          <div className="label mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-faint">
            <span className="numeric">{formattedTime}</span>
            <span className="numeric">{fitnessClass.duration_minutes} min</span>
            {fitnessClass.status !== "scheduled" && (
              <span>{fitnessClass.status}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {classWindow === "open" && !settled && (
            <Link href={`/live/${fitnessClass.id}`} className="btn btn-solid">
              Start class
            </Link>
          )}

          {!settled && classWindow !== "ended" && (
            <>
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="btn btn-outline"
              >
                {editing ? "Close" : "Edit"}
              </button>
              <StatusButton
                classId={fitnessClass.id}
                to="cancelled"
                label="Cancel"
              />
            </>
          )}

          {classWindow === "open" && fitnessClass.status === "live" && (
            <StatusButton
              classId={fitnessClass.id}
              to="ended"
              label="Mark ended"
            />
          )}
        </div>
      </div>

      {editing && (
        <EditForm
          fitnessClass={fitnessClass}
          localDateTime={localDateTime}
          onDone={() => setEditing(false)}
        />
      )}
    </li>
  );
}

function EditForm({
  fitnessClass,
  localDateTime,
  onDone,
}: {
  fitnessClass: FitnessClass;
  localDateTime: string;
  onDone: () => void;
}) {
  const [state, action] = useActionState<CoachState, FormData>(
    updateOwnClass,
    {},
  );

  return (
    <form
      action={action}
      className="mt-6 grid grid-cols-1 gap-5 border-l border-line-strong pl-6 sm:grid-cols-3"
    >
      <input type="hidden" name="classId" value={fitnessClass.id} />

      <div className="sm:col-span-3">
        <label htmlFor={`t-${fitnessClass.id}`} className="field-label">
          Title
        </label>
        <input
          id={`t-${fitnessClass.id}`}
          name="title"
          required
          maxLength={120}
          defaultValue={fitnessClass.title}
          className="field"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`s-${fitnessClass.id}`} className="field-label">
          Date and time
        </label>
        <input
          id={`s-${fitnessClass.id}`}
          name="scheduledAt"
          type="datetime-local"
          required
          defaultValue={localDateTime}
          className="field"
        />
      </div>

      <div>
        <label htmlFor={`d-${fitnessClass.id}`} className="field-label">
          Minutes
        </label>
        <input
          id={`d-${fitnessClass.id}`}
          name="durationMinutes"
          type="number"
          min={5}
          max={240}
          required
          defaultValue={fitnessClass.duration_minutes}
          className="field numeric"
        />
      </div>

      <div className="sm:col-span-3 flex flex-wrap items-center gap-4">
        <SaveButton />
        <button
          type="button"
          onClick={onDone}
          className="link text-[0.8125rem] text-faint"
        >
          Cancel editing
        </button>
        {state.error && (
          <p role="alert" className="field-error m-0">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="text-[0.8125rem] text-muted">
            {state.success}
          </p>
        )}
      </div>
    </form>
  );
}

/** Sibling forms, never nested — a <form> inside a <form> is dropped by the parser. */
function StatusButton({
  classId,
  to,
  label,
}: {
  classId: string;
  to: Extract<ClassStatus, "live" | "ended" | "cancelled">;
  label: string;
}) {
  const [state, action] = useActionState<CoachState, FormData>(
    setOwnClassStatus,
    {},
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="status" value={to} />
      <StatusSubmit label={label} />
      {state.error && (
        <span role="alert" className="text-[0.8125rem] text-[#d64545]">
          {state.error}
        </span>
      )}
    </form>
  );
}

function StatusSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="link text-[0.8125rem] text-faint disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-outline disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}
