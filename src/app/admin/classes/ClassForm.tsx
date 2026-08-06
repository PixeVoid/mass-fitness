"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClass, type ActionState } from "@/app/actions/admin";
import type { Profile } from "@/lib/db-types";

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
          className="field"
        />
        <p className="mt-2 text-[0.8125rem] text-faint">
          Your device&apos;s timezone. Members see it converted to IST.
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
              {trainer.name ?? trainer.phone ?? trainer.id}
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
