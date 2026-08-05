import "server-only";

/**
 * The video provider seam.
 *
 * LiveKit was wired straight through the token route and the room component,
 * which made "try a cheaper provider" a rewrite rather than an experiment —
 * and the free-tier ceiling makes that experiment likely. Everything above
 * this file now asks for *a room token* rather than a LiveKit token.
 *
 * What the seam does and does not cover, honestly:
 *
 *  - **Server side is fully abstracted.** Minting a token is the part that
 *    carries the paywall, the host/viewer decision and the publish rules, and
 *    none of that changes with the provider. That is the valuable half: it
 *    means a swap cannot quietly weaken access control.
 *  - **The room UI is not, and cannot be.** Every provider ships its own React
 *    SDK with its own components. What the seam gives you there is that
 *    `provider` travels back with the token, so adding one means adding a new
 *    stage component next to the existing one — not editing it.
 */

export type VideoProviderName = "livekit";

export interface RoomTokenRequest {
  /** Stable room name, stored on the class row. */
  room: string;
  /** Who is joining, as our own user id — so a participant traces to a row. */
  identity: string;
  displayName: string;
  /**
   * Hosts get screen share on top of camera and mic. Everyone may publish
   * camera and mic; that is the two-way class, not a privilege.
   */
  isHost: boolean;
  ttlSeconds: number;
}

export interface RoomToken {
  provider: VideoProviderName;
  token: string;
  /** Where the browser dials. Public — it is in the client bundle anyway. */
  serverUrl: string;
}

export interface VideoProvider {
  readonly name: VideoProviderName;
  createRoomToken(request: RoomTokenRequest): Promise<RoomToken>;
}
