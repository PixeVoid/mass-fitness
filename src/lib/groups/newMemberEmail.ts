import "server-only";

/**
 * "Someone new joined your group" — sent to the coach.
 *
 * Carries enough for them to plan the first session rather than just
 * announcing an arrival. The assessment score in particular is data you have
 * been collecting since the quiz shipped and nobody has ever read.
 */
export function buildNewMemberEmail(args: {
  coachName: string;
  memberName: string;
  groupName: string;
  fitnessGoal: string | null;
  assessment: {
    score: number | null;
    band: string | null;
    summary: string | null;
  } | null;
  coachUrl: string;
}): { subject: string; html: string } {
  const subject = `${args.memberName} joined ${args.groupName}`;

  const assessmentBlock = args.assessment
    ? `
      <div style="margin: 24px 0; padding: 18px; background: #f7f6f4; border-radius: 12px;">
        <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; color: #6b6b6b; margin: 0;">Their self-assessment</p>
        ${
          args.assessment.score !== null
            ? `<p style="font-size: 30px; font-weight: 700; margin: 10px 0 0;">${args.assessment.score}<span style="font-size: 15px; color: #6b6b6b;"> / 100</span></p>`
            : ""
        }
        ${
          args.assessment.band
            ? `<p style="font-size: 16px; font-weight: 600; margin: 2px 0 0;">${escapeHtml(args.assessment.band)}</p>`
            : ""
        }
        ${
          args.assessment.summary
            ? `<p style="font-size: 14px; line-height: 1.6; color: #6b6b6b; margin: 8px 0 0;">${escapeHtml(args.assessment.summary)}</p>`
            : ""
        }
        <p style="font-size: 12px; color: #9a9a9a; margin: 12px 0 0;">Full answers are on their profile in the coach area.</p>
      </div>
    `
    : `
      <p style="font-size: 14px; line-height: 1.6; color: #9a9a9a; margin: 20px 0 0;">
        They haven't taken the self-assessment, so you're starting from scratch on the first session.
      </p>
    `;

  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #121212;">
      <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; color: #6b6b6b; margin: 0;">Mass Fitness — new member</p>

      <h1 style="font-size: 26px; line-height: 1.2; margin: 16px 0 0;">${escapeHtml(args.memberName)}</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #6b6b6b; margin: 6px 0 0;">joined ${escapeHtml(args.groupName)}</p>

      <p style="font-size: 15px; line-height: 1.6; margin: 24px 0 0;">
        Hi ${escapeHtml(args.coachName)} — they're on your roster from now, and they'll show up in your next session for this group.
      </p>

      ${
        args.fitnessGoal
          ? `<p style="font-size: 15px; line-height: 1.6; margin: 16px 0 0;"><strong>What they're training for:</strong> ${escapeHtml(args.fitnessGoal)}</p>`
          : ""
      }

      ${assessmentBlock}

      <p style="margin: 28px 0;">
        <a href="${escapeHtml(args.coachUrl)}"
           style="display: inline-block; background: #121212; color: #f7f6f4; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-size: 15px; font-weight: 500;">
          Open your schedule
        </a>
      </p>

      <p style="font-size: 12px; color: #9a9a9a; margin-top: 32px; line-height: 1.5;">
        This member's assessment is shared with you because they agreed to it when they took the quiz. Treat it as confidential — it is health information about a person you are about to coach.
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
