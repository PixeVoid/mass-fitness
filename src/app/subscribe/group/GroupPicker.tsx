"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinGroup, pickCoach, type GroupState } from "@/app/actions/groups";

/**
 * The step straight after paying: which cohort are you in.
 *
 * Group members choose a *group*, not a coach — deliberately. Offer a list of
 * people and everyone picks the same one, leaving one coach at forty clients
 * and another at three. A group carries the coach anyway, plus the focus and
 * roughly when it runs, which is a better basis for the decision and lets
 * capacity enforce itself: a full group is simply not on the list.
 *
 * One-to-one is the exception, because there is no group yet — picking the
 * coach is what creates one.
 */

export interface PickableGroup {
  id: string;
  name: string;
  focus: string;
  trainerName: string | null;
  scheduleHint: string | null;
  spacesLeft: number;
  capacity: number;
}

export interface PickableCoach {
  id: string;
  name: string | null;
  slotsLeft: number;
}

export function GroupChoices({ groups }: { groups: PickableGroup[] }) {
  const [state, action] = useActionState<GroupState, FormData>(joinGroup, {});

  return (
    <form action={action}>
      <ul className="flex flex-col gap-px border-t border-line bg-line">
        {groups.map((group) => (
          <li key={group.id} className="bg-paper">
            {/* Grid rather than flex-wrap: wrapping dropped "3 of 12 left"
                onto its own line, left-aligned under the radio, where it read
                as a stray label instead of a counter. Two columns hold. */}
            <label className="grid cursor-pointer grid-cols-[1fr_auto] items-start gap-x-4 p-5 transition-colors duration-300 hover:bg-surface sm:gap-x-6 sm:p-6">
              <span className="flex min-w-0 items-start gap-4">
                <input
                  type="radio"
                  name="groupId"
                  value={group.id}
                  required
                  className="mt-1.5 h-4 w-4 shrink-0 accent-[color:var(--ink)]"
                />
                <span className="min-w-0">
                  <span className="display-sm block text-[1.25rem] text-ink">
                    {group.name}
                  </span>
                  <span className="mt-1.5 block text-[0.9375rem] text-muted">
                    {group.trainerName ? `with ${group.trainerName} · ` : ""}
                    {group.focus}
                  </span>
                  {group.scheduleHint && (
                    <span className="label mt-2.5 block text-faint">
                      {group.scheduleHint}
                    </span>
                  )}
                </span>
              </span>

              <span className="label whitespace-nowrap pt-1.5 text-right text-faint">
                {group.spacesLeft} left
              </span>
            </label>
          </li>
        ))}
      </ul>

      {state.error && (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      )}

      <Submit label="Join this group" />
    </form>
  );
}

export function CoachChoices({ coaches }: { coaches: PickableCoach[] }) {
  const [state, action] = useActionState<GroupState, FormData>(pickCoach, {});

  return (
    <form action={action}>
      <ul className="flex flex-col gap-px border-t border-line bg-line">
        {coaches.map((coach) => (
          <li key={coach.id} className="bg-paper">
            <label className="flex cursor-pointer flex-wrap items-center justify-between gap-x-6 gap-y-3 p-5 transition-colors duration-300 hover:bg-surface sm:p-6">
              <span className="flex items-center gap-4">
                <input
                  type="radio"
                  name="coachId"
                  value={coach.id}
                  required
                  className="h-4 w-4 shrink-0 accent-[color:var(--ink)]"
                />
                <span className="display-sm text-[1.25rem] text-ink">
                  {coach.name ?? "Coach"}
                </span>
              </span>
              <span className="label text-faint">
                {coach.slotsLeft} slot{coach.slotsLeft === 1 ? "" : "s"} open
              </span>
            </label>
          </li>
        ))}
      </ul>

      {state.error && (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      )}

      <Submit label="Choose this coach" />
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-solid mt-8 w-full disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Setting up…" : label}
    </button>
  );
}
