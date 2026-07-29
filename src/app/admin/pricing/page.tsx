import { requireAdmin } from "@/lib/auth/dal";
import { getPricingCatalogue } from "@/lib/pricing";
import PricingForm from "./PricingForm";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  await requireAdmin();
  const catalogue = await getPricingCatalogue();

  return (
    <>
      <h1 className="display-sm text-[1.75rem] text-ink">Pricing</h1>

      <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
        Monthly prices for Group and One-to-one, plus the discount applied for
        quarterly and annual terms. Changes apply immediately to the landing
        page and to new memberships — they never change what an existing
        member was already charged.
      </p>

      <div className="mt-10 max-w-lg">
        <PricingForm catalogue={catalogue} />
      </div>
    </>
  );
}
