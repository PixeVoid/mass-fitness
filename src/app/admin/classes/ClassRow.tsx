"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateClass, type ActionState } from "@/app/actions/admin";
import { personOptionLabel } from "@/lib/people";
import { formatClassTime, toIstLocalInput } from "@/lib/schedule";
import type { FitnessClass, Profile } from "@/lib/db-types";
import StatusForm from "./StatusForm";

/**
 * One class in the admin schedule, with an editor that opens in place.
 *
 * Admins could create a class and cancel it, but not correct it: a typo in a
 * title, or a time an hour out, meant cancelling and recreating — which loses
 * the room and leaves anyone who already had it on their dashboard looking at
 * a cancelled session with no explanation.
 *
 * The editor is collapsed by default and rendered only when open, so a page
 * listing a hundred classes does not carry a hundred hydrated forms.
 */
export default function ClassRow({
  fitnessClass,
  trainers,
}: {
  fitnessClass: FitnessClass;
  trainers: Profile[];
}) {
  const [editing, setEditing] = useState(false);
  const closed =
    fitnessClass.status === "ended" || fitnessClass.status === "cancelled";

  return (
    <li className="border-t border-line py-5">
      <div className="grid grid-cols-1 items-baseline gap-x-6 gap-y-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-[0.9375rem] text-ink">
            {fitnessClass.title}
            {!fitnessClass.is_premium && (
              <span className="label ml-3 text-faint">free</span>
            )}
          </p>
          <p className="mt-1 text-[0.8125rem] text-faint">
            {fitnessClass.trainer_id
              ? `with ${
                  trainers.find((t) => t.id === fitnessClass.trainer_id)?.name ??
                  "unknown"
                }`
              : "no trainer assigned"}
          </p>
        </div>

        <div className="label flex flex-wrap items-center gap-x-4 gap-y-2 text-faint lg:col-span-4">
          <span className="numeric">
            {formatClassTime(fitnessClass.scheduled_at)}
          </span>
          <span className="numeric">{fitnessClass.duration_minutes} min</span>
        </div>

        <div className="flex items-center gap-3 lg:col-span-3 lg:justify-self-end">
          {/* Nothing to correct on a class that has already happened, and
              editing one would rewrite a record of something that took place. */}
          {!closed && (
            <button
              type="button"
              onClick={() => setEditing((open) => !open)}
              className="link text-[0.8125rem]"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
          )}
          <StatusForm classId={fitnessClass.id} status={fitnessClass.status} />
        </div>
      </div>

      {editing && (
        <EditForm
          fitnessClass={fitnessClass}
          trainers={trainers}
          onDone={() => setEditing(false)}
        />
      )}
    </li>
  );
}

function EditForm({
  fitnessClass,
  trainers,
  onDone,
}: {
  fitnessClass: FitnessClass;
  trainers: Profile[];
  onDone: () => void;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await updateClass(prev, formData);
      if (result.success) onDone();
      return result;
    },
    {},
  );

  return (
    <form
      action={action}
      className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2"
    >
      <input type="hidden" name="classId" value={fitnessClass.id} />

      <div className="sm:col-span-2">
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

      <div>
        <label htmlFor={`s-${fitnessClass.id}`} className="field-label">
          Date and time (IST)
        </label>
        <input
          id={`s-${fitnessClass.id}`}
          name="scheduledAt"
          type="datetime-local"
          required
          // Rendered back in IST. Using the raw timestamp would show the UTC
          // wall clock, and saving it unchanged would shift the class by five
          // and a half hours every time anyone touched the title.
          defaultValue={toIstLocalInput(new Date(fitnessClass.scheduled_at))}
          className="field"
        />
      </div>

      <div>
        <label htmlFor={`d-${fitnessClass.id}`} className="field-label">
          Duration (minutes)
        </label>
        <input
          id={`d-${fitnessClass.id}`}
          name="durationMinutes"
          type="number"
          inputMode="numeric"
          min={5}
          max={240}
          defaultValue={fitnessClass.duration_minutes}
          required
          className="field numeric"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`tr-${fitnessClass.id}`} className="field-label">
          Trainer
        </label>
        <select
          id={`tr-${fitnessClass.id}`}
          name="trainerId"
          defaultValue={fitnessClass.trainer_id ?? ""}
          className="field"
        >
          <option value="">Unassigned</option>
          {trainers.map((trainer) => (
            <option key={trainer.id} value={trainer.id}>
              {personOptionLabel(trainer)}
            </option>
          ))}
        </select>
      </div>

      {/* Audience is not editable, for the reason it is not on the coach's
          form either: a field that fell back to its "all" default would
          publish a private session to the whole membership on a title fix. */}
      <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
        <Save />
        <button type="button" onClick={onDone} className="link text-[0.8125rem]">
          Cancel
        </button>
        {state.error && (
          <p role="alert" className="field-error !mt-0">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-solid disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}
