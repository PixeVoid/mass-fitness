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
  defaultEmail,
}: {
  next: string;
  defaultName?: string | null;
  defaultEmail?: string | null;
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
        <label htmlFor="email" className="field-label">
          Email <span className="text-faint">(optional)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          defaultValue={defaultEmail ?? ""}
          placeholder="you@example.com"
          aria-invalid={state.fieldErrors?.email ? "true" : undefined}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          className="field"
        />
        <p className="mt-2 text-[0.8125rem] text-faint">
          Only used for receipts and class reminders.
        </p>
        {state.fieldErrors?.email && (
          <p id="email-error" role="alert" className="field-error">
            {state.fieldErrors.email}
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
