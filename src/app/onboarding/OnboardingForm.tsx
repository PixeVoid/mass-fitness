"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  completeOnboarding,
  type OnboardingState,
} from "@/app/actions/auth";

const GOALS = [
  "Build strength",
  "Lose fat",
  "Improve mobility",
  "General conditioning",
  "Return from injury",
];

/**
 * First-login capture (BUILD_PLAN Phase 2). Name is the only required field —
 * every extra required box here costs signups, and support only genuinely
 * needs a name against the phone number.
 */
export default function OnboardingForm({
  next,
  defaultName,
  defaultPhone,
}: {
  next: string;
  defaultName?: string | null;
  defaultPhone?: string | null;
}) {
  const [state, action] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="name" className="field-label">
          Your name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          autoFocus
          required
          maxLength={80}
          defaultValue={defaultName ?? ""}
          aria-invalid={state.fieldErrors?.name ? "true" : undefined}
          aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
          className="field"
        />
        {state.fieldErrors?.name && (
          <p id="name-error" role="alert" className="field-error">
            {state.fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="fitness_goal" className="field-label">
          What are you training for?{" "}
          <span className="text-faint">(optional)</span>
        </label>
        <input
          id="fitness_goal"
          name="fitness_goal"
          type="text"
          list="fitness-goals"
          maxLength={280}
          placeholder="Build strength"
          aria-invalid={state.fieldErrors?.fitness_goal ? "true" : undefined}
          className="field"
        />
        {/* A datalist rather than a select: the suggestions cover most people
            without shutting out anyone whose goal isn't on the list. */}
        <datalist id="fitness-goals">
          {GOALS.map((goal) => (
            <option key={goal} value={goal} />
          ))}
        </datalist>
        {state.fieldErrors?.fitness_goal && (
          <p role="alert" className="field-error">
            {state.fieldErrors.fitness_goal}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="field-label">
          Mobile number <span className="text-faint">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          defaultValue={defaultPhone ?? ""}
          placeholder="98765 43210"
          aria-invalid={state.fieldErrors?.phone ? "true" : undefined}
          aria-describedby={state.fieldErrors?.phone ? "phone-error" : undefined}
          className="field numeric"
        />
        <p className="mt-2 text-[0.8125rem] text-faint">
          Only used for class reminders and support.
        </p>
        {state.fieldErrors?.phone && (
          <p id="phone-error" role="alert" className="field-error">
            {state.fieldErrors.phone}
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-solid w-full disabled:opacity-60"
    >
      {pending ? "Saving…" : "Continue"}
    </button>
  );
}
