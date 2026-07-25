"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  sendOtp,
  signInWithGoogle,
  verifyOtp,
  type AuthFormState,
} from "@/app/actions/auth";

/**
 * Two-step OTP form, plus a Google button above it. Which OTP step renders is
 * driven by the action's returned state rather than local component state, so
 * a failed verify cannot drop the user back to the email step and lose the
 * code they already received.
 */
export default function LoginForm({
  next,
  error,
}: {
  next: string;
  error?: string;
}) {
  const [emailState, sendAction] = useActionState<AuthFormState, FormData>(
    sendOtp,
    { step: "email" },
  );

  if (emailState.step === "code" && emailState.email) {
    return (
      <CodeStep
        next={next}
        email={emailState.email}
        notice={emailState.notice}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <GoogleButton />
      </form>

      <div className="flex items-center gap-4 text-[0.8125rem] text-faint">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={sendAction} className="flex flex-col gap-5">
        <div>
          <label htmlFor="email" className="field-label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            required
            placeholder="you@example.com"
            defaultValue={emailState.email ?? ""}
            aria-invalid={emailState.error || error ? "true" : undefined}
            aria-describedby={emailState.error ? "email-error" : undefined}
            className="field"
          />
          {(emailState.error || error) && (
            <p id="email-error" role="alert" className="field-error">
              {emailState.error ?? error}
            </p>
          )}
        </div>

        <SubmitButton idle="Send code" busy="Sending…" />
      </form>
    </div>
  );
}

function CodeStep({
  email,
  next,
  notice,
}: {
  email: string;
  next: string;
  notice?: string;
}) {
  const [state, verifyAction] = useActionState<AuthFormState, FormData>(
    verifyOtp,
    { step: "code", email, notice },
  );

  return (
    <form action={verifyAction} className="flex flex-col gap-5">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="token" className="field-label">
          Code sent to {email}
        </label>
        <input
          id="token"
          name="token"
          type="text"
          // `one-time-code` is what lets iOS and Android offer an email/SMS
          // code straight from the keyboard bar where the OS can find one.
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="\d*"
          maxLength={8}
          autoFocus
          required
          placeholder="123456"
          aria-invalid={state.error ? "true" : undefined}
          aria-describedby={state.error ? "token-error" : undefined}
          className="field numeric text-center text-xl tracking-[0.4em]"
        />
        {state.error ? (
          <p id="token-error" role="alert" className="field-error">
            {state.error}
          </p>
        ) : (
          state.notice && (
            <p className="mt-2 text-[0.8125rem] text-faint">{state.notice}</p>
          )
        )}
      </div>

      <SubmitButton idle="Verify and continue" busy="Verifying…" />

      <p className="text-center text-[0.8125rem] text-faint">
        Wrong email?{" "}
        <a href="/login" className="link text-ink">
          Start over
        </a>
      </p>
    </form>
  );
}

/**
 * Split out because `useFormStatus` only reports the status of the form it is
 * rendered inside — reading it from the same component that owns the <form>
 * always returns pending: false.
 */
function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-solid w-full disabled:opacity-60"
    >
      {pending ? busy : idle}
    </button>
  );
}

function GoogleButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-outline flex w-full items-center justify-center gap-3 disabled:opacity-60"
    >
      <GoogleIcon />
      {pending ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.73A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.73V4.94H.95A8.997 8.997 0 0 0 0 9c0 1.45.35 2.83.95 4.06l3.02-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A8.997 8.997 0 0 0 .95 4.94l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
