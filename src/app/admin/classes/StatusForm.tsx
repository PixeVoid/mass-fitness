"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setClassStatus, type ActionState } from "@/app/actions/admin";
import type { ClassStatus } from "@/lib/db-types";

const NEXT_STATUS: Record<ClassStatus, { to: ClassStatus; label: string } | null> =
  {
    // A class does not need to be marked live to be joinable — the token route
    // never reads status except to refuse ended/cancelled ones. This is for the
    // schedule to read truthfully.
    scheduled: { to: "live", label: "Mark live" },
    live: { to: "ended", label: "Mark ended" },
    ended: null,
    cancelled: null,
  };

/**
 * Sibling forms, never nested — a <form> inside a <form> is invalid HTML and
 * the inner one is dropped by the parser.
 */
export default function StatusForm({
  classId,
  status,
}: {
  classId: string;
  status: ClassStatus;
}) {
  const next = NEXT_STATUS[status];

  if (!next) {
    return <span className="label text-faint">{status}</span>;
  }

  return (
    <div className="flex items-center gap-3">
      <StatusButton
        classId={classId}
        to={next.to}
        label={next.label}
        variant="outline"
      />
      {status === "scheduled" && (
        <StatusButton
          classId={classId}
          to="cancelled"
          label="Cancel"
          variant="link"
        />
      )}
    </div>
  );
}

function StatusButton({
  classId,
  to,
  label,
  variant,
}: {
  classId: string;
  to: ClassStatus;
  label: string;
  variant: "outline" | "link";
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    setClassStatus,
    {},
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="status" value={to} />
      <Submit label={label} variant={variant} />
      {state.error && (
        <span role="alert" className="text-[0.8125rem] text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}

function Submit({
  label,
  variant,
}: {
  label: string;
  variant: "outline" | "link";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        variant === "outline"
          ? "btn btn-outline disabled:opacity-60"
          : "link text-[0.8125rem] disabled:opacity-60"
      }
    >
      {pending ? "…" : label}
    </button>
  );
}
