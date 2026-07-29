import { TIER_LABELS } from "./labels";
import type { AssessmentResult } from "./types";

/** Same business number used elsewhere on the site (Footer, landing contact section). */
const BUSINESS_WHATSAPP_NUMBER = "916207524549";

/**
 * A prefilled wa.me link rather than an automated send — the WhatsApp
 * Business Cloud API needs Meta business verification and an approved
 * message template before it can send anything, so this ships now and
 * automation can replace it later without changing the UI contract (still
 * just a URL to open).
 */
export function buildWhatsAppResultLink(name: string, result: AssessmentResult): string {
  const text =
    `Hi, I'm ${name}. I just completed the Mass Fitness self-assessment — ` +
    `my score is ${result.total}/100 (${result.band}). ` +
    `I'd like to know more about the ${TIER_LABELS[result.tierNudge]} plan.`;

  return `https://wa.me/${BUSINESS_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
