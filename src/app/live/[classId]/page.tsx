import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LiveRoom from "@/components/live/LiveRoom";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { getClassById } from "@/lib/classes";

export const metadata: Metadata = {
  title: "Live class",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Shell for the live viewer. The real access decision belongs to
 * /api/live/token — this page only refuses obvious non-cases (signed out,
 * class doesn't exist) so a member doesn't wait on a WebRTC handshake to be
 * told no.
 */
export default async function LivePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  await requireOnboardedProfile();
  const { classId } = await params;

  const fitnessClass = await getClassById(classId);
  if (!fitnessClass) notFound();

  return <LiveRoom classId={classId} />;
}
