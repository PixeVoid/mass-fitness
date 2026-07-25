"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireUser } from "@/lib/auth/dal";
import { publicEnv } from "@/lib/env";
import { normalisePhone } from "@/lib/phone";
import { safeRedirectTarget } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth (BUILD_PLAN section 0, auth row — email OTP + Google OAuth).
 *
 * Originally phone OTP, switched because it required an Indian SMS/WhatsApp
 * provider before a single login could be tested. Email OTP and Google OAuth
 * are both free at this scale and need no provider account beyond Supabase
 * itself.
 *
 * Server Actions rather than route handlers for the OTP form: it posts
 * straight to the server, so the code never travels through client-side JS we
 * control, and Supabase's cookie writes land on a response that is still
 * open.
 *
 * Treat every action here as a public endpoint — it is one. Anything that
 * mutates re-checks the session itself; none of them trust the caller.
 */

export interface AuthFormState {
  step: "email" | "code";
  email?: string;
  error?: string;
  notice?: string;
}

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Enter a valid email address.");

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "Enter the code from the email.");

export async function sendOtp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return {
      step: "email",
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    // Signup and login are the same gesture for OTP — there is no password to
    // set, so making the user pick a flow up front would be a false choice.
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { step: "email", email: parsed.data, error: error.message };
  }

  return {
    step: "code",
    email: parsed.data,
    notice: "We've sent you a 6-digit code.",
  };
}

export async function verifyOtp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // The email comes back from a hidden field, so re-validate rather than
  // trusting it: a tampered value must not be able to verify a code against a
  // different account.
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return {
      step: "email",
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const code = codeSchema.safeParse(formData.get("token"));
  if (!code.success) {
    return {
      step: "code",
      email: parsed.data,
      error: code.error.issues[0]?.message ?? "Enter the code from the email.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data,
    token: code.data,
    type: "email",
  });

  if (error || !data.user) {
    return {
      step: "code",
      email: parsed.data,
      error: error?.message ?? "That code didn't work. Try again.",
    };
  }

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

/**
 * Kicks off the Google OAuth handshake. `signInWithOAuth` doesn't redirect
 * itself — it hands back the provider's consent-screen URL, which this action
 * then redirects to. The callback lands at /auth/callback (see route.ts
 * there), which is what actually creates the session.
 */
export async function signInWithGoogle(formData: FormData) {
  const next = safeRedirectTarget(String(formData.get("next") ?? ""));
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in failed.")}`);
  }

  redirect(data.url);
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
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
});

export interface OnboardingState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "fitness_goal" | "phone", string>>;
}

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    fitness_goal: formData.get("fitness_goal"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    const fieldErrors: OnboardingState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "fitness_goal" || key === "phone") {
        fieldErrors[key] ??= issue.message;
      }
    }
    return { fieldErrors };
  }

  // Phone is an optional contact field now (not the auth key), but still
  // worth normalising to E.164 so support isn't searching for the same
  // person under three different spellings of one number.
  let normalisedPhone: string | null = null;
  if (parsed.data.phone) {
    const phoneResult = normalisePhone(parsed.data.phone);
    if (!phoneResult.ok) {
      return { fieldErrors: { phone: phoneResult.error } };
    }
    normalisedPhone = phoneResult.phone;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      fitness_goal: parsed.data.fitness_goal || null,
      phone: normalisedPhone,
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
