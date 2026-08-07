import { signOut } from "@/app/actions/auth";
import ConfirmSubmit from "@/components/ConfirmSubmit";

/**
 * Sign out, asked once.
 *
 * It was a bare submit button sitting next to Admin and Schedule in a row of
 * identically styled pills — one mis-tap from ending the session, and getting
 * back in means a fresh magic link and a trip to an inbox. That is a long way
 * round for a slip.
 *
 * Neutral rather than red: signing out is confirmable but not destructive, and
 * spending the danger colour here would cheapen it where it does mean gone for
 * good.
 *
 * A component rather than three copies of the same markup, because the three
 * places it appears — dashboard, admin, coach — are exactly the kind of thing
 * that drifts, and a sign-out that asks in two places and not the third is
 * worse than one that never asks.
 */
export default function SignOutButton({
  className = "btn btn-outline gap-2",
}: {
  className?: string;
}) {
  return (
    <ConfirmSubmit
      action={signOut}
      label="Sign out"
      confirmLabel="Sign out"
      tone="neutral"
      triggerClassName={className}
      title="Sign out?"
      body="You'll need to sign in again with a fresh link from your email to get back in."
    />
  );
}
