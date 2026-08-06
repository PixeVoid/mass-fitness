"use client";

import { useEffect, useRef } from "react";

/**
 * The modal shell behind every "are you sure".
 *
 * Extracted because there are two callers with genuinely different mechanics —
 * one submits a server action, one navigates — and the *dialog* behaviour must
 * not fork between them. Getting the top layer, the focus trap, Escape and the
 * backdrop right once is worth more than saving the indirection.
 *
 * The native `<dialog>` does all of that itself. The only thing it has no
 * declarative form of is opening: the `open` attribute renders a non-modal
 * dialog with no backdrop and no focus trap, which is a different element
 * behaviour, so `showModal()` is called from an effect.
 */
export default function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  /** The action buttons. Cancel is supplied here; confirm comes from the caller. */
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Escape and a programmatic close both fire this, so state follows the
      // element rather than trying to intercept every route out of it.
      onClose={onClose}
      onClick={(event) => {
        // The dialog element itself is the backdrop; the panel inside is a
        // different target, so this fires only on an outside click.
        if (event.target === ref.current) onClose();
      }}
      className="confirm-dialog"
    >
      <div className="p-6 sm:p-8">
        <h2 className="display-sm text-[1.375rem] text-ink">{title}</h2>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          {body}
        </p>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          {children}
        </div>
      </div>
    </dialog>
  );
}
