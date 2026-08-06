import "server-only";

import { AccessToken, TrackSource, type VideoGrant } from "livekit-server-sdk";
import { serverEnv } from "@/lib/env";
import type {
  RoomToken,
  RoomTokenRequest,
  VideoProvider,
} from "@/lib/video/provider";

/**
 * LiveKit's implementation of the seam.
 *
 * The publish rules live here rather than at the call site because they are
 * expressed in LiveKit's own vocabulary — `canPublishSources` and its
 * TrackSource enum. A different provider spells the same intent differently,
 * and the intent is what the caller passes in: "this participant is a host",
 * not "give them SCREEN_SHARE".
 */
export function createLiveKitProvider(): VideoProvider {
  return {
    name: "livekit",

    async createRoomToken(request: RoomTokenRequest): Promise<RoomToken> {
      const grant: VideoGrant = {
        room: request.room,
        roomJoin: true,
        // Members publish too. A coach correcting your setup is the product —
        // it cannot work if the coach can't see you. Publishing is
        // *permitted*, not started: the client joins with both off, so nobody
        // meets a browser permission prompt for walking into a class.
        canPublish: true,
        canSubscribe: true,
        // Screen share stays with the host. It is the one publish that can put
        // something private on the main stage in front of everyone.
        // canPublishSources supersedes canPublish wherever it is set, so this
        // is the flag that actually decides.
        canPublishSources: request.isHost
          ? [
              TrackSource.CAMERA,
              TrackSource.MICROPHONE,
              TrackSource.SCREEN_SHARE,
              TrackSource.SCREEN_SHARE_AUDIO,
            ]
          : [TrackSource.CAMERA, TrackSource.MICROPHONE],
        // Lets participants use chat/reactions without opening a media track.
        canPublishData: true,
        canUpdateOwnMetadata: false,
      };

      const token = new AccessToken(
        serverEnv.livekitApiKey,
        serverEnv.livekitApiSecret,
        {
          identity: request.identity,
          name: request.displayName,
          ttl: request.ttlSeconds,
        },
      );
      token.addGrant(grant);

      return {
        provider: "livekit",
        token: await token.toJwt(),
        serverUrl: serverEnv.livekitUrl,
      };
    },
  };
}

/**
 * The provider in use. One line to change when a swap happens — and the only
 * line, on the server side.
 */
export function getVideoProvider(): VideoProvider {
  return createLiveKitProvider();
}
