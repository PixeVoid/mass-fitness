"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setCoachCapacity, type AdminGroupState } from "@/app/actions/adminGroups";

export default function CoachCapacityForm({
  userId,
  capacity,
}: {
  userId: string;
  capacity: number;
}) {
  const [state, action] = useActionState<AdminGroupState, FormData>(
    setCoachCapacity,
    {},
  );

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="userId" value={userId} />
      {/* Was `text-faint` at the default field size — the number that decides
          whether a coach is bookable at all, rendered as the quietest thing
          on the row and small enough to mis-tap. It is a primary control. */}
      <label htmlFor={`cap-${userId}`} className="label text-ink">
        Max
      </label>
      <input
        id={`cap-${userId}`}
        name="capacity"
        type="number"
        min={0}
        max={50}
        defaultValue={capacity}
        className="field numeric w-24 !py-3 text-center !text-[1.125rem] !text-ink"
      />
      <Submit />
      {state.error && (
        <span role="alert" className="text-[0.8125rem] text-danger">
          {state.error}
        </span>
      )}
      {state.success && (
        <span role="status" className="text-[0.8125rem] text-muted">
          {state.success}
        </span>
      )}
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-outline disabled:opacity-60"
    >
      {pending ? "…" : "Save"}
    </button>
  );
}
