"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  cancelMembership,
  grantMembership,
  setUserRole,
  type ActionState,
} from "@/app/actions/admin";
import type { Profile, Subscription } from "@/lib/db-types";
import { formatPhoneForDisplay } from "@/lib/phone";
import { PLANS, formatPaise, getPlan } from "@/lib/plans";

/**
 * One member, with the two things an admin actually needs to do to them:
 * change their role, and give or revoke a membership.
 *
 * The controls stay collapsed until asked for — a member list where every row
 * is a form is unreadable at 50 rows.
 */
export default function MemberRow({
  profile,
  subscription,
}: {
  profile: Profile;
  subscription: Subscription | null;
}) {
  const [open, setOpen] = useState(false);

  const active =
    subscription?.status === "active" &&
    !!subscription.end_date &&
    new Date(subscription.end_date) > new Date();

  return (
    <li className="border-t border-line py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-[0.9375rem] text-ink">
            {profile.name ?? "—"}
            {profile.role !== "member" && (
              <span className="label ml-3 text-faint">{profile.role}</span>
            )}
          </p>
          <p className="numeric mt-1 text-[0.8125rem] text-faint">
            {profile.email ?? "no email"}
            {profile.phone ? ` · ${formatPhoneForDisplay(profile.phone)}` : ""}
          </p>
          {profile.fitness_goal && (
            <p className="mt-1 text-[0.8125rem] text-muted">
              Goal: {profile.fitness_goal}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="label text-faint">
              {active ? "Active" : (subscription?.status ?? "No plan")}
            </p>
            {subscription && active && (
              <p className="numeric mt-1 text-[0.8125rem] text-faint">
                {getPlan(subscription.plan_tier, subscription.plan_duration).label}
                {" · "}
                {formatPaise(subscription.amount_paise)}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="btn btn-outline"
          >
            {open ? "Close" : "Manage"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-6 grid grid-cols-1 gap-8 border-t border-line pt-6 lg:grid-cols-2">
          <RoleForm profile={profile} />
          <MembershipForm
            profile={profile}
            subscription={active ? subscription : null}
          />
        </div>
      )}
    </li>
  );
}

function RoleForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ActionState, FormData>(setUserRole, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <h3 className="label text-faint">Role</h3>
      <input type="hidden" name="userId" value={profile.id} />

      <label htmlFor={`role-${profile.id}`} className="field-label">
        A trainer can publish video in classes assigned to them. An admin can do
        everything here.
      </label>
      <select
        id={`role-${profile.id}`}
        name="role"
        defaultValue={profile.role}
        className="field"
      >
        <option value="member">Member</option>
        <option value="trainer">Trainer</option>
        <option value="admin">Admin</option>
      </select>

      <Submit idle="Save role" busy="Saving…" />
      <Feedback state={state} />
    </form>
  );
}

function MembershipForm({
  profile,
  subscription,
}: {
  profile: Profile;
  subscription: Subscription | null;
}) {
  const [grantState, grantAction] = useActionState<ActionState, FormData>(
    grantMembership,
    {},
  );
  const [cancelState, cancelAction] = useActionState<ActionState, FormData>(
    cancelMembership,
    {},
  );

  const [planId, setPlanId] = useState(PLANS[0].id);
  const selected = PLANS.find((p) => p.id === planId) ?? PLANS[0];

  return (
    <div className="flex flex-col gap-3">
      <h3 className="label text-faint">Membership</h3>

      <form action={grantAction} className="flex flex-col gap-3">
        <input type="hidden" name="userId" value={profile.id} />
        <input type="hidden" name="planTier" value={selected.tier} />
        <input type="hidden" name="planDuration" value={selected.duration} />

        <label htmlFor={`plan-${profile.id}`} className="field-label">
          Plan
        </label>
        <select
          id={`plan-${profile.id}`}
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="field"
        >
          {PLANS.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.label} · {plan.durationLabel}
              {plan.priceConfirmed ? "" : " (price unconfirmed)"}
            </option>
          ))}
        </select>

        <label htmlFor={`amount-${profile.id}`} className="field-label">
          Amount collected (₹) — set 0 for a comp
        </label>
        <input
          id={`amount-${profile.id}`}
          name="amountRupees"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          // Defaults to the catalogue price but stays editable: until PhonePe
          // lands, payments arrive over UPI or in cash for whatever was agreed,
          // and the record should say what was actually collected.
          key={selected.id}
          defaultValue={Math.round(selected.amountPaise / 100)}
          className="field numeric"
        />

        <Submit idle="Grant membership" busy="Granting…" />
        <Feedback state={grantState} />
      </form>

      {subscription && (
        <form action={cancelAction} className="mt-2">
          <input
            type="hidden"
            name="subscriptionId"
            value={subscription.id}
          />
          <Submit idle="Cancel current membership" busy="Cancelling…" outline />
          <Feedback state={cancelState} />
        </form>
      )}
    </div>
  );
}

function Submit({
  idle,
  busy,
  outline,
}: {
  idle: string;
  busy: string;
  outline?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn w-full disabled:opacity-60 ${outline ? "btn-outline" : "btn-solid"}`}
    >
      {pending ? busy : idle}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="field-error">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="mt-1 text-[0.8125rem] text-muted">
        {state.success}
      </p>
    );
  }
  return null;
}
