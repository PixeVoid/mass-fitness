"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * Leaving a live class, on purpose rather than by accident.
 *
 * "Leave" sat next to the class title as a plain link, one mis-tap from the
 * top edge of a phone screen, and taking it dropped the connection instantly.
 * Rejoining is not free: it re-mints a token, renegotiates WebRTC and drops
 * whatever the coach was mid-sentence about.
 *
 * The host gets different copy because the stakes are different. A member
 * leaving affects one person; a coach leaving takes the camera the class is
 * watching with them, and they should be told that before it happens rather
 * than after.
 */
export default function LeaveButton({ isHost }: { isHost: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn shrink-0 border border-[color:var(--inverse-fg)]/30 text-[color:var(--inverse-fg)]"
      >
        Leave
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={isHost ? "Leave the class you're running?" : "Leave this class?"}
        body={
          isHost
            ? "Your camera and mic stop for everyone watching. The room stays open and you can come back, but the class goes quiet until you do."
            : "You'll drop out of the session. You can rejoin from your dashboard while the class is still running."
        }
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="btn btn-danger"
        >
          {isHost ? "Leave anyway" : "Leave class"}
        </button>
      </ConfirmDialog>
    </>
  );
}
