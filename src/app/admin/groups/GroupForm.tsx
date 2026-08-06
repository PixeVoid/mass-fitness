"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createGroup, type AdminGroupState } from "@/app/actions/adminGroups";
import type { Profile } from "@/lib/db-types";
import { personOptionLabel } from "@/lib/people";

/**
 * Creating a shared cohort.
 *
 * Only `kind = 'group'` is created here. One-to-one cohorts make themselves
 * when a member picks a coach — creating one by hand would produce a private
 * group with nobody in it, counting against that coach's capacity forever.
 */
export default function GroupForm({ trainers }: { trainers: Profile[] }) {
  const [state, action] = useActionState<AdminGroupState, FormData>(
    createGroup,
    {},
  );

  return (
    <form
      action={action}
      className="panel grid grid-cols-1 gap-5 rounded-2xl p-6 sm:grid-cols-2 sm:p-8"
    >
      <div className="sm:col-span-2">
        <label htmlFor="name" className="field-label">
          Group name — members see this
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
          placeholder="Morning Strength"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="focus" className="field-label">
          Focus
        </label>
        <input
          id="focus"
          name="focus"
          required
          maxLength={40}
          list="group-focuses"
          defaultValue="Strength"
          className="field"
        />
        <datalist id="group-focuses">
          <option value="Strength" />
          <option value="Fat loss" />
          <option value="Mobility" />
          <option value="Conditioning" />
          <option value="Return from injury" />
        </datalist>
      </div>

      <div>
        <label htmlFor="trainerId" className="field-label">
          Coach
        </label>
        <select id="trainerId" name="trainerId" required className="field">
          <option value="">Pick a coach</option>
          {trainers.map((trainer) => (
            <option key={trainer.id} value={trainer.id}>
              {personOptionLabel(trainer)}
            </option>
          ))}
        </select>
        {trainers.length === 0 && (
          <p className="mt-2 text-[0.8125rem] text-faint">
            Nobody has the trainer role yet — set one on the Members tab.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="capacity" className="field-label">
          Capacity
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          max={200}
          defaultValue={12}
          required
          className="field numeric"
        />
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-faint">
          Hard limit. The group stops being offered once it is full.
        </p>
      </div>

      <div>
        <label htmlFor="scheduleHint" className="field-label">
          When it runs — shown to members choosing
        </label>
        <input
          id="scheduleHint"
          name="scheduleHint"
          maxLength={80}
          placeholder="Mon/Wed/Fri 7:00am"
          className="field"
        />
      </div>

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
      {pending ? "Creating…" : "Create group"}
    </button>
  );
}
