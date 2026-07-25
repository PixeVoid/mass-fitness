"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendOtp, verifyOtp, type AuthFormState } from "@/app/actions/auth";
import { formatPhoneForDisplay } from "@/lib/phone";

/**
 * Two-step OTP form. Which step renders is driven by the action's returned
 * state rather than local component state, so a failed verify cannot drop the
 * user back to the phone step and lose the code they already received.
 */
export default function LoginForm({ next }: { next: string }) {
  const [phoneState, sendAction] = useActionState<AuthFormState, FormData>(
    sendOtp,
    { step: "phone" },
  );

  if (phoneState.step === "code" && phoneState.phone) {
    return (
      <CodeStep
        next={next}
        phone={phoneState.phone}
        notice={phoneState.notice}
      />
    );
  }

  return (
    <form action={sendAction} className="flex flex-col gap-5">
      <div>
        <label htmlFor="phone" className="field-label">
          Mobile number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          // Numeric keypad on mobile, and autofill from the SIM where the OS
          // offers it.
          inputMode="tel"
          autoComplete="tel"
          autoFocus
          required
          placeholder="98765 43210"
          defaultValue={phoneState.phone ?? ""}
          aria-invalid={phoneState.error ? "true" : undefined}
          aria-describedby={phoneState.error ? "phone-error" : undefined}
          className="field numeric"
        />
        <p className="mt-2 text-[0.8125rem] text-faint">
          Indian numbers don&apos;t need the +91.
        </p>
        {phoneState.error && (
          <p id="phone-error" role="alert" className="field-error">
            {phoneState.error}
          </p>
        )}
      </div>

      <SubmitButton idle="Send code" busy="Sending…" />
    </form>
  );
}

function CodeStep({
  phone,
  next,
  notice,
}: {
  phone: string;
  next: string;
  notice?: string;
}) {
  const [state, verifyAction] = useActionState<AuthFormState, FormData>(
    verifyOtp,
    { step: "code", phone, notice },
  );

  return (
    <form action={verifyAction} className="flex flex-col gap-5">
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="token" className="field-label">
          Code sent to {formatPhoneForDisplay(phone)}
        </label>
        <input
          id="token"
          name="token"
          type="text"
          // `one-time-code` is what lets iOS and Android offer the SMS code
          // straight from the keyboard bar.
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
        Wrong number?{" "}
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
