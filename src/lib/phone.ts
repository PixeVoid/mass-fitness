/**
 * Phone normalisation.
 *
 * Supabase Auth keys OTP users on the phone string it is given, so "9876543210"
 * and "+919876543210" would become two separate accounts for the same person.
 * Everything is normalised to E.164 before it reaches the auth API, and the
 * normalised form is what lands in profiles.phone (unique).
 *
 * India-first: a bare 10-digit number is assumed to be +91. Anything already
 * carrying a country code is left alone.
 */

const DEFAULT_COUNTRY_CODE = "91";

export type PhoneResult =
  | { ok: true; phone: string }
  | { ok: false; error: string };

export function normalisePhone(input: string): PhoneResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter your mobile number." };
  }

  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");

  // 0-prefixed STD dialling — "09876543210".
  if (!hadPlus && digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!hadPlus && digits.length === 10) {
    digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  if (digits.length < 10 || digits.length > 15) {
    return { ok: false, error: "That doesn't look like a valid mobile number." };
  }

  // Indian mobile numbers start 6-9. Catching this here saves the user an SMS
  // round trip and us the cost of sending it.
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === 12) {
    const subscriber = digits.slice(2);
    if (!/^[6-9]\d{9}$/.test(subscriber)) {
      return {
        ok: false,
        error: "Enter a valid 10-digit Indian mobile number.",
      };
    }
  }

  return { ok: true, phone: `+${digits}` };
}

/** "+919876543210" → "+91 98765 43210", for read-back in the OTP screen. */
export function formatPhoneForDisplay(phone: string): string {
  const match = /^\+(\d{2})(\d{5})(\d{5})$/.exec(phone);
  if (!match) return phone;
  return `+${match[1]} ${match[2]} ${match[3]}`;
}
