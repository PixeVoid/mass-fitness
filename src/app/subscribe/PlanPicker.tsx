"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { beginCheckout } from "@/app/actions/payments";
import type { PlanDuration, PlanTier } from "@/lib/db-types";

/**
 * Tier then term, in that order.
 *
 * Nine plans in one grid is a wall of near-identical cards and a decision
 * nobody wants to make. Splitting it means two easy choices: what kind of
 * coaching, then how long — and the term row can then say what each option
 * actually saves, which is the argument for the longer ones.
 *
 * Prices arrive pre-formatted. The catalogue is admin-editable and lives
 * server-side; sending numbers here to re-derive a total would be a second
 * place for the price to be wrong.
 */

export interface PickerPlan {
  id: string;
  tier: PlanTier;
  duration: PlanDuration;
  label: string;
  durationLabel: string;
  summary: string;
  perks: string[];
  featured: boolean;
  months: number;
  amount: string;
  perMonth: string;
}

const DURATION_ORDER: PlanDuration[] = ["monthly", "quarterly", "annual"];

export default function PlanPicker({
  plans,
  preselected,
}: {
  plans: PickerPlan[];
  preselected?: string;
}) {
  const initial = plans.find((p) => p.id === preselected);

  const [tier, setTier] = useState<PlanTier>(
    initial?.tier ?? plans.find((p) => p.featured)?.tier ?? "group",
  );
  const [duration, setDuration] = useState<PlanDuration>(
    initial?.duration ?? "monthly",
  );

  const tiers = plans.filter((p) => p.duration === "monthly");
  const terms = DURATION_ORDER.map((d) =>
    plans.find((p) => p.tier === tier && p.duration === d),
  ).filter((p): p is PickerPlan => Boolean(p));

  const selected = plans.find((p) => p.tier === tier && p.duration === duration);
  const monthly = plans.find((p) => p.tier === tier && p.duration === "monthly");

  return (
    <form action={beginCheckout}>
      <input type="hidden" name="plan" value={selected?.id ?? ""} />

      <fieldset>
        <legend className="label text-faint">Coaching</legend>
        <div className="mt-6 grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-2">
          {tiers.map((option) => {
            const active = option.tier === tier;
            return (
              <button
                key={option.tier}
                type="button"
                onClick={() => setTier(option.tier)}
                aria-pressed={active}
                className={`flex flex-col p-6 text-left transition-colors duration-300 sm:p-8 ${
                  active ? "bg-surface" : "bg-paper hover:bg-surface"
                }`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="display-sm text-[1.5rem] text-ink">
                    {option.label}
                  </span>
                  {active && <span className="label text-faint">Selected</span>}
                </span>
                <span className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                  {option.summary}
                </span>
                <ul className="mt-6 flex flex-col gap-2.5 border-t border-line pt-5">
                  {option.perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-baseline gap-3 text-[0.875rem] text-muted"
                    >
                      <span aria-hidden="true" className="text-faint">
                        &mdash;
                      </span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-12">
        <legend className="label text-faint">Term</legend>
        <div className="mt-6 flex flex-col gap-px border-t border-line bg-line">
          {terms.map((option) => {
            const active = option.duration === duration;
            // What the longer term saves against paying monthly for the same
            // number of months — the only number that makes the case for it.
            const saving =
              monthly && option.months > 1
                ? percentOff(monthly.perMonth, option.perMonth)
                : null;

            return (
              <button
                key={option.duration}
                type="button"
                onClick={() => setDuration(option.duration)}
                aria-pressed={active}
                className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 p-5 text-left transition-colors duration-300 sm:p-6 ${
                  active ? "bg-surface" : "bg-paper hover:bg-surface"
                }`}
              >
                <span className="flex items-baseline gap-3">
                  <span className="display-sm text-[1.25rem] text-ink">
                    {option.durationLabel}
                  </span>
                  {saving && (
                    <span className="label text-faint">Save {saving}</span>
                  )}
                </span>
                <span className="flex items-baseline gap-3">
                  <span className="numeric text-[1.125rem] text-ink">
                    {option.amount}
                  </span>
                  <span className="label text-faint">
                    {option.months === 1
                      ? "per month"
                      : `${option.perMonth}/mo`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {selected && (
        <div className="mt-12 border-t border-line pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-[0.9375rem] text-muted">
              {selected.label} · {selected.durationLabel}
            </p>
            <p className="numeric text-[1.75rem] text-ink">{selected.amount}</p>
          </div>
          <SubmitButton />
        </div>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-solid mt-6 w-full disabled:opacity-60"
      >
        {pending ? "Opening checkout…" : "Continue to payment"}
      </button>
      <p className="mt-4 text-[0.8125rem] leading-relaxed text-faint">
        You&rsquo;ll be taken to PhonePe to pay. Your card details never touch
        our servers.
      </p>
    </>
  );
}

/** "10%" from two pre-formatted currency strings, or null if it isn't a saving. */
function percentOff(monthly: string, effective: string): string | null {
  const a = Number(monthly.replace(/[^\d]/g, ""));
  const b = Number(effective.replace(/[^\d]/g, ""));
  if (!a || !b || b >= a) return null;
  return `${Math.round(((a - b) / a) * 100)}%`;
}
