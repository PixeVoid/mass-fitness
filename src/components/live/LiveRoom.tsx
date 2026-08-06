"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LiveKitStage from "./livekit/LiveKitStage";

/**
 * Class viewer (BUILD_PLAN 3.6) — the provider-agnostic half.
 *
 * Asks /api/live/token who this member is and whether they may join, then
 * hands off to whichever stage the answer names. Everything here is about
 * getting in: fetching the token, and turning a refusal into copy someone can
 * act on. None of it changes if the video vendor does.
 *
 * `provider` comes back with the token rather than being read from an env var
 * on this side, so a swap is a server-side decision and a client that is
 * mid-navigation during a deploy cannot mismatch the two.
 */

interface TokenResponse {
  provider: string;
  token: string;
  serverUrl: string;
  room: string;
  role: "host" | "viewer";
  classTitle: string;
}

type Phase =
  | { status: "loading" }
  | { status: "error"; message: string; action?: { href: string; label: string } }
  | { status: "ready"; data: TokenResponse };

const ERRORS: Record<string, { message: string; href?: string; label?: string }> =
  {
    unauthenticated: { message: "Your session expired. Log in again.", href: "/login", label: "Log in" },
    subscription_required: {
      message: "This class is for members. Pick a plan to join live sessions.",
      href: "/subscribe",
      label: "See the plans",
    },
    not_in_group: {
      message:
        "This session is for a different group. Your own classes are on your dashboard.",
      href: "/dashboard",
      label: "My classes",
    },
    class_not_found: { message: "That class no longer exists." },
    class_closed: { message: "This class has finished." },
    class_not_open: {
      message: "This class hasn't opened yet. The room unlocks 20 minutes before it starts.",
      href: "/dashboard",
      label: "My classes",
    },
  };

/**
 * "…opens at 6:40 am" beats "not yet". The server sends the moment rather than
 * a formatted string so this reads in the viewer's own timezone — a member
 * travelling is still told a time they can act on.
 */
function notOpenMessage(opensAtMs: unknown): string | null {
  if (typeof opensAtMs !== "number" || !Number.isFinite(opensAtMs)) return null;

  const opensAt = new Date(opensAtMs);
  if (Number.isNaN(opensAt.getTime())) return null;

  const time = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(opensAt);

  return `This class hasn't opened yet. The room unlocks ${time}, 20 minutes before it starts.`;
}

export default function LiveRoom({ classId }: { classId: string }) {
  const [phase, setPhase] = useState<Phase>({ status: "loading" });

  useEffect(() => {
    // Aborted on unmount so a fast back-navigation doesn't set state on a
    // torn-down component.
    const controller = new AbortController();

    async function fetchToken() {
      try {
        const response = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId }),
          signal: controller.signal,
        });

        const body = await response.json();

        if (!response.ok) {
          const known = ERRORS[body?.error as string];
          const message =
            body?.error === "class_not_open"
              ? notOpenMessage(body?.opensAtMs)
              : null;

          setPhase({
            status: "error",
            message: message ?? known?.message ?? "Couldn't join this class.",
            action:
              known?.href && known.label
                ? { href: known.href, label: known.label }
                : undefined,
          });
          return;
        }

        setPhase({ status: "ready", data: body as TokenResponse });
      } catch {
        if (controller.signal.aborted) return;
        setPhase({
          status: "error",
          message: "Couldn't reach the class. Check your connection.",
        });
      }
    }

    void fetchToken();
    return () => controller.abort();
  }, [classId]);

  if (phase.status === "loading") {
    return (
      <Centered>
        <p className="label text-faint">Joining…</p>
      </Centered>
    );
  }

  if (phase.status === "error") {
    return (
      <Centered>
        <p className="max-w-sm text-center text-[0.9375rem] leading-relaxed text-muted">
          {phase.message}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {phase.action && (
            <Link href={phase.action.href} className="btn btn-solid">
              {phase.action.label}
            </Link>
          )}
          <Link href="/dashboard" className="btn btn-outline">
            Back to dashboard
          </Link>
        </div>
      </Centered>
    );
  }

  const { provider, token, serverUrl, role, classTitle } = phase.data;

  // One case today. A second provider is a second case here and a sibling of
  // LiveKitStage — not an edit to it.
  switch (provider) {
    case "livekit":
      return (
        <LiveKitStage
          token={token}
          serverUrl={serverUrl}
          role={role}
          classTitle={classTitle}
        />
      );
    default:
      // Only reachable if the server is deployed ahead of the client — a stale
      // tab during a provider switch. Say so rather than render nothing; a
      // reload fixes it.
      return (
        <Centered>
          <p className="max-w-sm text-center text-[0.9375rem] leading-relaxed text-muted">
            This class needs a newer version of the app. Reload the page.
          </p>
        </Centered>
      );
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      {children}
    </main>
  );
}
