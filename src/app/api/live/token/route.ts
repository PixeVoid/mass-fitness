import { AccessToken, type VideoGrant } from "livekit-server-sdk";
import * as z from "zod";
import { getActiveSubscription, getProfile, getUser } from "@/lib/auth/dal";
import { getClassById } from "@/lib/classes";
import { serverEnv } from "@/lib/env";

/**
 * POST /api/live/token — mints a LiveKit join token (BUILD_PLAN 3.5).
 *
 * This route *is* the paywall. LiveKit will not admit a participant without a
 * token signed by our secret, so a user who is refused here cannot join by
 * any other means — there is no shareable link that bypasses it. Everything
 * it decides is re-derived server-side; nothing from the request body is
 * trusted beyond the class id.
 */

// Reads cookies and the database — never a candidate for prerendering.
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  classId: z.string().uuid("Unknown class."),
});

/**
 * Deliberately longer than a class. The token authorises the *join*; LiveKit
 * does not evict a participant when it expires, but a mid-class reconnect on
 * a dropped mobile network re-presents the same token. A short TTL would turn
 * a lost signal into an unrecoverable session. Access itself is re-checked on
 * every mint, so a long TTL does not extend a lapsed membership past the next
 * join. (Answers the token-expiry item in BUILD_PLAN 3.9.)
 */
const TOKEN_TTL_SECONDS = 3 * 60 * 60;

function json(body: unknown, status: number) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return json({ error: "unauthenticated" }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "invalid_body" }, 400);
  }

  const fitnessClass = await getClassById(parsed.data.classId);
  if (!fitnessClass) {
    return json({ error: "class_not_found" }, 404);
  }

  if (fitnessClass.status === "cancelled" || fitnessClass.status === "ended") {
    return json({ error: "class_closed" }, 409);
  }

  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";
  // A trainer publishes only into their own class. The admin role is the
  // override, so a stand-in coach is a data change, not a code change.
  const isHost = isAdmin || (!!profile && fitnessClass.trainer_id === user.id);

  // The gate. Hosts skip it — a trainer should not be locked out of the class
  // they are running because their own membership lapsed.
  if (fitnessClass.is_premium && !isHost) {
    // Checks status = 'active' *and* end_date in the future; an expired row
    // that was never swept still fails here.
    const subscription = await getActiveSubscription();
    if (!subscription) {
      return json(
        { error: "subscription_required", redirectTo: "/#pricing" },
        403,
      );
    }
  }

  const grant: VideoGrant = {
    room: fitnessClass.livekit_room,
    roomJoin: true,
    // One-to-many: the trainer publishes, everyone else receives. Viewers get
    // canPublish: false explicitly — omitting both flags grants both.
    canPublish: isHost,
    canSubscribe: true,
    // Lets viewers use chat/reactions without opening a media track.
    canPublishData: true,
    canUpdateOwnMetadata: false,
  };

  const token = new AccessToken(
    serverEnv.livekitApiKey,
    serverEnv.livekitApiSecret,
    {
      // Supabase user id, so a LiveKit participant is traceable back to a row.
      identity: user.id,
      name: profile?.name ?? "Member",
      ttl: TOKEN_TTL_SECONDS,
    },
  );
  token.addGrant(grant);

  return json(
    {
      token: await token.toJwt(),
      serverUrl: serverEnv.livekitUrl,
      room: fitnessClass.livekit_room,
      role: isHost ? "host" : "viewer",
      classTitle: fitnessClass.title,
    },
    200,
  );
}
