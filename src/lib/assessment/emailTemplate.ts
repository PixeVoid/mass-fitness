import type { AssessmentResult } from "./types";
import { TIER_LABELS } from "./labels";

export function buildResultEmailHtml(name: string, result: AssessmentResult): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #121212;">
      <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; color: #6b6b6b;">Mass Fitness — self-assessment</p>
      <h1 style="font-size: 28px; margin: 12px 0 4px;">Hi ${escapeHtml(name)},</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #6b6b6b;">Your full report is attached as a PDF. The short version:</p>
      <div style="margin: 24px 0; padding: 20px; background: #f7f6f4; border-radius: 12px;">
        <p style="font-size: 40px; font-weight: 700; margin: 0;">${result.total}<span style="font-size: 16px; color: #6b6b6b;"> / 100</span></p>
        <p style="font-size: 18px; font-weight: 600; margin: 4px 0 0;">${result.band}</p>
        <p style="font-size: 14px; color: #6b6b6b; margin: 2px 0 0;">${result.bandCopy}</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6;">Based on your answers, we'd recommend the <strong>${TIER_LABELS[result.tierNudge]}</strong> plan. A coach will follow up shortly — or message us on WhatsApp any time.</p>
      <p style="font-size: 12px; color: #9a9a9a; margin-top: 32px; line-height: 1.5;">This is a general fitness self-assessment, not a medical evaluation. Consult a physician before starting any new exercise programme.</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
