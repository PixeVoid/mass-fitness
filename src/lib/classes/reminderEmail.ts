import "server-only";

/**
 * "Your class starts soon" — the one email that actually gets people to turn
 * up. Plain, short, and mostly a button: it is read on a phone, minutes before
 * the thing it is about.
 *
 * Inline styles throughout, because email clients strip <style> blocks and
 * support no cascade worth relying on. The palette is the site's light theme
 * hard-coded — an email cannot read CSS variables, and a dark-mode email is
 * not worth the client-specific hacks it would take.
 */
export function buildClassReminderEmail(args: {
  name: string;
  title: string;
  trainerName: string | null;
  formattedTime: string;
  durationMinutes: number;
  joinUrl: string;
}): { subject: string; html: string } {
  const subject = `${args.title} starts soon`;

  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #121212;">
      <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; color: #6b6b6b; margin: 0;">Mass Fitness — starting soon</p>

      <h1 style="font-size: 26px; line-height: 1.2; margin: 16px 0 0;">${escapeHtml(args.title)}</h1>

      <p style="font-size: 15px; line-height: 1.6; color: #6b6b6b; margin: 8px 0 0;">
        ${args.trainerName ? `with ${escapeHtml(args.trainerName)} · ` : ""}${escapeHtml(args.formattedTime)} · ${args.durationMinutes} min
      </p>

      <p style="font-size: 15px; line-height: 1.6; margin: 24px 0 0;">
        Hi ${escapeHtml(args.name)}, this is your reminder. The room is open now —
        you can join early and get set up.
      </p>

      <p style="margin: 28px 0;">
        <a href="${escapeHtml(args.joinUrl)}"
           style="display: inline-block; background: #121212; color: #f7f6f4; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-size: 15px; font-weight: 500;">
          Join the class
        </a>
      </p>

      <p style="font-size: 13px; line-height: 1.6; color: #9a9a9a; margin: 0;">
        Nothing to install — it opens in your browser. Your camera and
        microphone stay off until you turn them on.
      </p>

      <p style="font-size: 12px; color: #9a9a9a; margin-top: 32px; line-height: 1.5;">
        You're getting this because you have an active Mass Fitness membership
        and this class is on your schedule.
      </p>
    </div>
  `;

  return { subject, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
