"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  VideoTrack,
  useConnectionState,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";

/**
 * Class viewer (BUILD_PLAN 3.6).
 *
 * One-to-many by construction: `useTracks` can only surface tracks that were
 * actually published, and the token route hands out `canPublish: false` to
 * everyone but the host — so there is no grid of viewer tiles to hide.
 *
 * Laid out for a phone propped against a wall mid-workout: video fills the
 * screen, controls sit in a bottom bar within thumb reach rather than in a
 * shrunk desktop toolbar.
 */

interface TokenResponse {
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
      href: "/#pricing",
      label: "See the plans",
    },
    class_not_found: { message: "That class no longer exists." },
    class_closed: { message: "This class has finished." },
  };

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
          setPhase({
            status: "error",
            message: known?.message ?? "Couldn't join this class.",
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

  const { token, serverUrl, role, classTitle } = phase.data;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      // Only the host opens a camera and mic. Viewers never get a permission
      // prompt, which matters when someone is joining from a bedroom.
      video={role === "host"}
      audio={role === "host"}
      className="flex min-h-dvh flex-col bg-inverse-bg"
    >
      {/* Renders every subscribed audio track. Without it the class is silent. */}
      <RoomAudioRenderer />
      <Stage title={classTitle} isHost={role === "host"} />
    </LiveKitRoom>
  );
}

function Stage({ title, isHost }: { title: string; isHost: boolean }) {
  const connectionState = useConnectionState();
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: false },
  );

  // Screen share wins when the trainer is demonstrating something on screen.
  const stageTrack =
    tracks.find((track) => track.source === Track.Source.ScreenShare) ??
    tracks[0];

  return (
    <>
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="label text-[color:var(--inverse-fg)] opacity-60">
            {connectionState === ConnectionState.Connected ? "Live" : "Connecting"}
          </p>
          <h1 className="display-sm mt-1 truncate text-lg text-[color:var(--inverse-fg)]">
            {title}
          </h1>
        </div>

        <Link
          href="/dashboard"
          className="btn shrink-0 border border-[color:var(--inverse-fg)]/30 text-[color:var(--inverse-fg)]"
        >
          Leave
        </Link>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {stageTrack ? (
          <VideoTrack
            trackRef={stageTrack}
            className="h-full w-full object-contain"
          />
        ) : (
          <p className="px-6 text-center text-[0.9375rem] text-[color:var(--inverse-fg)] opacity-70">
            {isHost
              ? "You're live. Your camera will appear here once it starts."
              : "Waiting for your trainer to start the class…"}
          </p>
        )}

        {/* Browsers block autoplaying audio until the user interacts. This
            renders a prompt only when that block is actually in effect. */}
        <StartAudio
          label="Tap for sound"
          className="btn btn-solid absolute bottom-4 left-1/2 -translate-x-1/2"
        />
      </div>

      {isHost && (
        <div className="flex items-center justify-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <TrackToggle
            source={Track.Source.Microphone}
            className="btn border border-[color:var(--inverse-fg)]/30 text-[color:var(--inverse-fg)]"
          >
            Mic
          </TrackToggle>
          <TrackToggle
            source={Track.Source.Camera}
            className="btn border border-[color:var(--inverse-fg)]/30 text-[color:var(--inverse-fg)]"
          >
            Camera
          </TrackToggle>
        </div>
      )}
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      {children}
    </main>
  );
}
