import "server-only";

import { serverEnv } from "@/lib/env";

/**
 * Minimal Resend client — a raw fetch to their REST API rather than the SDK,
 * same call as the chat routes make to Groq: one HTTP call, no vendor
 * lock-in beyond an API shape any transactional-email provider mostly
 * shares.
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  attachment?: { filename: string; content: Buffer };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: serverEnv.resendFromAddress,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        attachments: args.attachment
          ? [
              {
                filename: args.attachment.filename,
                content: args.attachment.content.toString("base64"),
              },
            ]
          : undefined,
      }),
    });
  } catch {
    return { ok: false, error: "provider_unreachable" };
  }

  if (!res.ok) {
    console.error("[email] resend error", res.status, await res.text().catch(() => ""));
    return { ok: false, error: "provider_error" };
  }

  return { ok: true };
}
