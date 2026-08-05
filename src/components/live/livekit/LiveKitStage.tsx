"use client";

import Link from "next/link";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  VideoTrack,
  useConnectionState,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";

/**
 * The LiveKit stage — everything that knows LiveKit exists.
 *
 * Split out from LiveRoom so that the parts which are *not* provider-specific
 * — fetching the token, mapping a refusal to copy a member can act on, the
 * loading and error states — do not have to be rewritten to try a different
 * video vendor. Adding a provider means adding a sibling of this file, and
 * one line in LiveRoom's switch.
 *
 * Two-way by design: a coach correcting your setup is what people are paying
 * for, and that cannot work one-way. The stage stays single-focus though —
 * the trainer (or their screen share) fills it and members appear as a strip
 * of small tiles, because in a class you watch one person and are glanced at,
 * you do not study fifteen equals.
 *
 * Camera and mic start **off** for everyone, host included. The token permits
 * publishing; it does not begin it.
 */
export default function LiveKitStage({
  token,
  serverUrl,
  role,
  classTitle,
}: {
  token: string;
  serverUrl: string;
  role: "host" | "viewer";
  classTitle: string;
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      // Joined dark and silent, host included. Both are one tap away in the
      // bottom bar; neither is imposed. This is also what keeps a member from
      // ever seeing a browser permission prompt they did not ask for.
      video={false}
      audio={false}
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
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: false },
  );

  // Screen share wins the stage when the trainer is demonstrating something on
  // screen; otherwise the host's camera does. Falling back to "whatever was
  // published first" would let an early member take the stage from the coach.
  const screenShare = tracks.find(
    (track) => track.source === Track.Source.ScreenShare,
  );
  const hostCamera = tracks.find(
    (track) =>
      track.source === Track.Source.Camera && isHostIdentity(track.participant),
  );
  const stageTrack = screenShare ?? hostCamera;

  // Everyone else with a camera on, minus whoever is already on the stage.
  const strip = tracks.filter(
    (track) =>
      track.source === Track.Source.Camera && track !== stageTrack,
  );

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
              ? "You're live. Turn on your camera below to start the class."
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

      {/* Whoever has their camera on. Scrolls horizontally rather than
          wrapping into rows that eat the stage on a phone. */}
      {strip.length > 0 && (
        <ul className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 pt-2 sm:px-6">
          {strip.map((track) => (
            <li
              key={track.participant.identity + track.source}
              className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-black/40 sm:w-36"
            >
              <VideoTrack trackRef={track} className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/45 px-2 py-1 text-[0.6875rem] text-white">
                {track.participant.name || "Member"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Controls for everyone now, not just the host — the toggles are the
          whole point of letting members publish. */}
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
        {isHost && (
          <TrackToggle
            source={Track.Source.ScreenShare}
            className="btn hidden border border-[color:var(--inverse-fg)]/30 text-[color:var(--inverse-fg)] sm:inline-flex"
          >
            Share
          </TrackToggle>
        )}
      </div>

      {!isHost && localParticipant.isCameraEnabled && (
        <p className="pb-2 text-center text-[0.6875rem] text-[color:var(--inverse-fg)] opacity-50">
          Your camera is on — your coach can see you.
        </p>
      )}
    </>
  );
}

/**
 * Who is running the class, as seen from the client.
 *
 * Screen share is host-only at the token level, so a participant publishing
 * one is provably the host. Beyond that the client has no trustworthy signal —
 * and it does not need one: this only decides which tile is biggest. The
 * decisions that matter were made when the token was minted.
 */
function isHostIdentity(participant: { permissions?: { canPublishSources?: unknown[] } }) {
  const sources = participant.permissions?.canPublishSources;
  return Array.isArray(sources) && sources.length > 2;
}
