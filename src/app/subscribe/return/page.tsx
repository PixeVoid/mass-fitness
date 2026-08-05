import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader, { HeaderSpacer } from "@/components/SiteHeader";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { settleCheckout } from "@/lib/payments/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Where PhonePe sends the customer back to.
 *
 * This page settles the purchase rather than waiting for the webhook, and it
 * does so by asking the gateway — nothing here trusts the query string beyond
 * using it to find the row. That ordering matters: webhooks are retried, get
 * delayed, and on a fresh integration may not be configured at all, and a
 * member who has just paid should not be looking at a locked dashboard while
 * an async callback catches up.
 *
 * The webhook still exists, for the customer who closes the tab on the
 * gateway's page. Both call the same idempotent settle.
 */
export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const profile = await requireOnboardedProfile();
  const { order } = await searchParams;

  if (!order) redirect("/dashboard");

  // The order id travels through the browser, so confirm it belongs to whoever
  // is signed in before acting on it. Service role because `subscriptions` has
  // no client-readable policy for another user's rows — and this check is
  // exactly why that matters.
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("phonepe_merchant_txn_id", order)
    .maybeSingle();

  if (!row || row.user_id !== profile.id) redirect("/dashboard");

  const result = await settleCheckout(order);

  if (result.outcome === "activated" || result.outcome === "already_active") {
    // Straight into picking a group. A member who has just paid and lands on
    // an empty dashboard has no way of knowing the product is not broken.
    redirect("/subscribe/group");
  }

  if (result.outcome === "failed") {
    redirect("/subscribe?error=cancelled");
  }

  // Pending or unknown: the payment may still land, so say so rather than
  // guessing. The webhook settles it if it does.
  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-[640px] px-5 pb-20 sm:px-8 sm:pb-28">
        <HeaderSpacer />

        <p className="label text-faint">Payment</p>
        <h1 className="display mt-5 text-[2rem] text-ink sm:text-[2.5rem]">
          Still confirming.
        </h1>
        <p className="mt-5 text-[0.9375rem] leading-relaxed text-muted">
          Your bank hasn&rsquo;t confirmed this payment yet. It usually takes a
          minute or two. Your membership unlocks automatically the moment it
          clears — you don&rsquo;t need to pay again.
        </p>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
          If money left your account and nothing has changed in an hour, send us
          the reference below and we&rsquo;ll sort it out.
        </p>
        <p className="numeric mt-6 text-[0.875rem] text-faint">{order}</p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/dashboard" className="btn btn-solid">
            Back to dashboard
          </Link>
          <a
            href="https://wa.me/916207524549"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            Message support
          </a>
        </div>
      </main>
    </>
  );
}
