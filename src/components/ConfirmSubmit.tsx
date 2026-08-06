"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * A button that asks before it does something irreversible.
 *
 * Deleting an FAQ used to be one click with no confirmation and no visual
 * warning — the button was a quiet grey link, indistinguishable from "Edit",
 * and the row was gone. Anything that cannot be undone should have to be
 * meant twice and should look like what it is.
 *
 * It owns its own `<form>` rather than sitting inside one. The confirm button
 * lives in a `<dialog>`, which the browser promotes to the top layer where it
 * is no longer a descendant of anything — so owning the form is what keeps the
 * association from depending on an id that has to stay unique across a page
 * rendering this component in a loop.
 */
export default function ConfirmSubmit({
  action,
  fields,
  label,
  title,
  body,
  confirmLabel,
  triggerClassName = "btn btn-quiet-danger",
}: {
  /** Server action to run on confirm. */
  action: (formData: FormData) => void | Promise<void>;
  /** Hidden inputs — the id of the thing being deleted, usually. */
  fields?: Record<string, string>;
  label: string;
  title: string;
  /** Say what will actually happen, in plain words. */
  body: string;
  confirmLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <form action={action}>
      {fields &&
        Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {label}
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        body={body}
      >
        <ConfirmButton label={confirmLabel ?? label} />
      </ConfirmDialog>
    </form>
  );
}

/**
 * Separate so `useFormStatus` can read the enclosing form's pending state — it
 * only reports for a form the component is rendered inside.
 */
function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-danger disabled:opacity-60"
    >
      {pending ? "Working…" : label}
    </button>
  );
}
