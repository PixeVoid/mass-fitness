"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 * **Back counts as leaving too.** Guarding only the button left the most
 * common accidental exit — the browser's back gesture, which on Android is a
 * swipe from the screen edge — completely unguarded. So the same dialog is
 * armed against history navigation and against closing the tab.
 *
 * The host gets different copy because the stakes are different. A member
 * leaving affects one person; a coach leaving takes the camera the class is
 * watching with them.
 */
export default function LeaveButton({ isHost }: { isHost: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Set the moment leaving is confirmed, so the guards below stand down and
  // the navigation they exist to intercept is allowed through.
  const leaving = useRef(false);

  useEffect(() => {
    // A sentinel history entry. Back then pops *this* rather than the entry
    // that brought us here, so the page stays put and popstate becomes a
    // signal we can act on instead of a navigation already completed.
    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      if (leaving.current) return;

      // The browser has consumed the sentinel, so put another one back —
      // otherwise a second Back would leave with no prompt at all.
      window.history.pushState(null, "", window.location.href);
      setOpen(true);
    };

    // Covers reload and tab close, which no in-page dialog can intercept. The
    // browser shows its own wording; `preventDefault` is what asks for it.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  const leave = useCallback(() => {
    // Stand the guards down before navigating, or the push below re-triggers
    // the very prompt the user just answered.
    leaving.current = true;
    setOpen(false);
    router.push("/dashboard");
  }, [router]);

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
        <button type="button" onClick={leave} className="btn btn-danger">
          {isHost ? "Leave anyway" : "Leave class"}
        </button>
      </ConfirmDialog>
    </>
  );
}
