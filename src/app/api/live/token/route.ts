import * as z from "zod";
import { getActiveSubscription, getProfile, getUser } from "@/lib/auth/dal";
import { classJoinWindow, decideClassDoor, getClassById } from "@/lib/classes";
import { decideJoin } from "@/lib/groups";
import { getVideoProvider } from "@/lib/video/livekit";

/**
 * POST /api/live/token — mints a room join token (BUILD_PLAN 3.5).
 *
 * This route *is* the paywall. The video provider will not admit a participant
 * without a token signed by our secret, so a user who is refused here cannot
 * join by any other means — there is no shareable link that bypasses it.
 * Everything it decides is re-derived server-side; nothing from the request
 * body is trusted beyond the class id.
 *
 * Which provider mints the token is decided behind `getVideoProvider()`, and
 * this route deliberately knows nothing about it. That keeps the access
 * decision — the part worth being careful about — untouched by a change of
 * video vendor.
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

  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";
  // A trainer publishes only into their own class. The admin role is the
  // override, so a stand-in coach is a data change, not a code change.
  const isHost = isAdmin || (!!profile && fitnessClass.trainer_id === user.id);

  // The door, enforced here rather than only drawn on the dashboard. This used
  // to read the status field alone, which meant the 20-minute window was copy
  // and not a rule: a token could be minted for a class days out, and one
  // whose trainer never marked it ended stayed open indefinitely.
  const door = decideClassDoor(fitnessClass, { isHost });
  if (door === "closed") {
    return json({ error: "class_closed" }, 409);
  }
  if (door === "too_early") {
    return json(
      {
        error: "class_not_open",
        // So the client can say *when*, rather than just "not yet".
        opensAtMs: classJoinWindow(fitnessClass).opensAtMs,
      },
      409,
    );
  }

  // The gate, in one decision. It used to sit inside `if (is_premium)`, which
  // meant a free class targeted at one cohort admitted anybody signed in — and
  // it read nothing about plan tier, so a one-to-one membership silently
  // included every group class. `decideClassAccess` is now the only rule, and
  // the dashboard and the reminder job call the same one.
  const subscription = isHost ? null : await getActiveSubscription();
  const decision = await decideJoin(
    fitnessClass,
    user.id,
    subscription?.plan_tier ?? null,
    isHost,
  );

  if (decision === "subscription_required") {
    return json({ error: "subscription_required", redirectTo: "/subscribe" }, 403);
  }
  if (decision === "not_in_group") {
    return json({ error: "not_in_group", redirectTo: "/dashboard" }, 403);
  }

  const provider = getVideoProvider();
  const room = await provider.createRoomToken({
    room: fitnessClass.livekit_room,
    // Our own user id, so a participant in the provider's dashboard traces
    // back to a row here.
    identity: user.id,
    displayName: profile?.name ?? "Member",
    isHost,
    ttlSeconds: TOKEN_TTL_SECONDS,
  });

  return json(
    {
      // `provider` travels with the token so the client knows which stage
      // component to render — that is the client half of the seam.
      provider: room.provider,
      token: room.token,
      serverUrl: room.serverUrl,
      room: fitnessClass.livekit_room,
      role: isHost ? "host" : "viewer",
      classTitle: fitnessClass.title,
    },
    200,
  );
}
