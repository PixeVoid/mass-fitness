"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePricing, type ActionState } from "@/app/actions/pricing";
import type { PricingCatalogue } from "@/lib/plans";

export default function PricingForm({
  catalogue,
}: {
  catalogue: PricingCatalogue;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updatePricing,
    {},
  );

  const quarterlyPercent = Math.round(catalogue.discounts.quarterly.discount * 100);
  const annualPercent = Math.round(catalogue.discounts.annual.discount * 100);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <label htmlFor="groupRupees" className="field-label">
            Group — monthly (₹)
          </label>
          <input
            id="groupRupees"
            name="groupRupees"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            defaultValue={Math.round(catalogue.monthlyPaise.group / 100)}
            className="field numeric"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="oneToOneRupees" className="field-label">
            One-to-one — monthly (₹)
          </label>
          <input
            id="oneToOneRupees"
            name="oneToOneRupees"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            defaultValue={Math.round(catalogue.monthlyPaise.one_to_one / 100)}
            className="field numeric"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="quarterlyDiscountPercent" className="field-label">
            Quarterly discount (%)
          </label>
          <input
            id="quarterlyDiscountPercent"
            name="quarterlyDiscountPercent"
            type="number"
            inputMode="numeric"
            min={0}
            max={90}
            step={1}
            defaultValue={quarterlyPercent}
            className="field numeric"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="annualDiscountPercent" className="field-label">
            Annual discount (%)
          </label>
          <input
            id="annualDiscountPercent"
            name="annualDiscountPercent"
            type="number"
            inputMode="numeric"
            min={0}
            max={90}
            step={1}
            defaultValue={annualPercent}
            className="field numeric"
          />
        </div>
      </div>

      <Submit />
      {state.error && (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-[0.8125rem] text-muted">
          {state.success}
        </p>
      )}
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-solid w-full disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Saving…" : "Save pricing"}
    </button>
  );
}
