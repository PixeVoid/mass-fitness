"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireUser } from "@/lib/auth/dal";
import { normalisePhone } from "@/lib/phone";
import { safeRedirectTarget } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Phase 2 — phone-OTP auth (BUILD_PLAN section 2, Phase 2).
 *
 * Server Actions rather than route handlers: the form posts straight to the
 * server, so the OTP never travels through client-side JS we control, and
 * Supabase's cookie writes land on a response that is still open.
 *
 * Treat every action here as a public endpoint — it is one. Anything that
 * mutates re-checks the session itself; none of them trust the caller.
 */

export interface AuthFormState {
  step: "phone" | "code";
  phone?: string;
  error?: string;
  notice?: string;
}

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "Enter the code from the SMS.");

export async function sendOtp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = normalisePhone(String(formData.get("phone") ?? ""));
  if (!parsed.ok) {
    return { step: "phone", error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.phone,
    // Signup and login are the same gesture for OTP — there is no password to
    // set, so making the user pick a flow up front would be a false choice.
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { step: "phone", phone: parsed.phone, error: error.message };
  }

  return {
    step: "code",
    phone: parsed.phone,
    notice: "We've sent you a 6-digit code.",
  };
}

export async function verifyOtp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // The phone comes back from a hidden field, so re-normalise rather than
  // trusting it: a tampered value must not be able to verify a code against a
  // different account.
  const parsed = normalisePhone(String(formData.get("phone") ?? ""));
  if (!parsed.ok) {
    return { step: "phone", error: parsed.error };
  }

  const code = codeSchema.safeParse(formData.get("token"));
  if (!code.success) {
    return {
      step: "code",
      phone: parsed.phone,
      error: code.error.issues[0]?.message ?? "Enter the code from the SMS.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone: parsed.phone,
    token: code.data,
    type: "sms",
  });

  if (error || !data.user) {
    return {
      step: "code",
      phone: parsed.phone,
      error: error?.message ?? "That code didn't work. Try again.",
    };
  }

  // The signup trigger creates the profile row; this only fills in the phone
  // for rows that predate it. Failure here is not worth blocking a login over.
  await supabase
    .from("profiles")
    .update({ phone: parsed.phone })
    .eq("id", data.user.id)
    .is("phone", null);

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", data.user.id)
    .maybeSingle();

  const next = safeRedirectTarget(
    String(formData.get("next") ?? ""),
    "/dashboard",
  );

  // redirect() signals by throwing, so it must sit outside any try/catch that
  // would swallow it — and after every await that still needs to run.
  redirect(profile?.onboarded_at ? next : `/onboarding?next=${encodeURIComponent(next)}`);
}

const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tell us what to call you.")
    .max(80, "That name is too long."),
  fitness_goal: z
    .string()
    .trim()
    .max(280, "Keep it under 280 characters.")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(254)
    .email("That email doesn't look right.")
    .optional()
    .or(z.literal("")),
});

export interface OnboardingState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "fitness_goal" | "email", string>>;
}

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    fitness_goal: formData.get("fitness_goal"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const fieldErrors: OnboardingState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "fitness_goal" || key === "email") {
        fieldErrors[key] ??= issue.message;
      }
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      fitness_goal: parsed.data.fitness_goal || null,
      email: parsed.data.email || null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Couldn't save your details. Try again." };
  }

  revalidatePath("/dashboard");
  redirect(safeRedirectTarget(String(formData.get("next") ?? ""), "/dashboard"));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
