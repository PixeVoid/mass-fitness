import type {
  AssessmentAnswers,
  AssessmentResult,
  ResultBand,
  ScoreBreakdown,
} from "./types";

/**
 * Scoring for the 15-question self-assessment. Always run server-side on the
 * submitted answers — the client shows a live preview with the same
 * function, but the stored score and the one used to pick the tier nudge are
 * whatever this computes from the answers that were actually submitted, never
 * a number the client sent.
 *
 * Four categories, 25 points each, out of 100 — see the spec this was built
 * from (BMI, activity, physical performance, lifestyle). Physical
 * performance (Q12-15) is the one optional section in the UI; when it's
 * skipped the other three are rescaled to fill the full 100 rather than
 * leaving the score artificially capped at 75.
 */

function bmiScore(heightCm: number, weightKg: number): { score: number; bmi: number } {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  let score: number;
  if (bmi >= 18.5 && bmi <= 24.9) score = 25;
  else if ((bmi >= 25 && bmi <= 29.9) || (bmi >= 17 && bmi < 18.5)) score = 18;
  else if ((bmi >= 30 && bmi <= 34.9) || bmi < 17) score = 12;
  else score = 6;

  return { score, bmi: Math.round(bmi * 10) / 10 };
}

const ACTIVITY_LEVEL_POINTS: Record<AssessmentAnswers["activityLevel"], number> = {
  sedentary: 0,
  light: 4,
  moderate: 8.5,
  very_active: 12.5,
};

const ROUTINE_POINTS: Record<AssessmentAnswers["routine"], number> = {
  none: 0,
  occasional: 4,
  plateaued: 8.5,
  progressing: 12.5,
};

function activityScore(answers: AssessmentAnswers): number {
  return ACTIVITY_LEVEL_POINTS[answers.activityLevel] + ROUTINE_POINTS[answers.routine];
}

const TOE_TOUCH_POINTS: Record<NonNullable<AssessmentAnswers["toeTouch"]>, number> = {
  no: 0,
  difficulty: 3,
  yes: 6.25,
};

const PUSHUP_POINTS: Record<NonNullable<AssessmentAnswers["pushups"]>, number> = {
  "0_5": 0,
  "6_15": 2.5,
  "16_25": 4.5,
  "25_plus": 6.25,
};

const SQUAT_POINTS: Record<NonNullable<AssessmentAnswers["squats30s"]>, number> = {
  under_10: 0,
  "10_20": 2.5,
  "20_30": 4.5,
  "30_plus": 6.25,
};

const STAIRS_POINTS: Record<NonNullable<AssessmentAnswers["stairsBreath"]>, number> = {
  very_winded: 0,
  somewhat_winded: 2.5,
  barely_winded: 4.5,
  not_at_all: 6.25,
};

/** Null when any of the four questions was left unanswered — Section 5 is optional. */
function physicalScore(answers: AssessmentAnswers): number | null {
  const { toeTouch, pushups, squats30s, stairsBreath } = answers;
  if (!toeTouch || !pushups || !squats30s || !stairsBreath) return null;

  return (
    TOE_TOUCH_POINTS[toeTouch] +
    PUSHUP_POINTS[pushups] +
    SQUAT_POINTS[squats30s] +
    STAIRS_POINTS[stairsBreath]
  );
}

const SLEEP_POINTS: Record<AssessmentAnswers["sleepHours"], number> = {
  under_5: 2,
  "5_6": 7,
  "7_8": 12.5,
  "8_plus": 11,
};

const DIET_POINTS: Record<AssessmentAnswers["diet"], number> = {
  home_cooked: 12.5,
  mixed: 8,
  mostly_outside: 3,
  irregular: 1,
};

function lifestyleScore(answers: AssessmentAnswers): number {
  return SLEEP_POINTS[answers.sleepHours] + DIET_POINTS[answers.diet];
}

const BAND_COPY: Record<ResultBand, string> = {
  Beginner: "Let's build your foundation",
  Developing: "You're on your way",
  Fit: "Let's optimize further",
  Advanced: "Fine-tuning mode",
};

function bandForScore(total: number): ResultBand {
  if (total <= 40) return "Beginner";
  if (total <= 65) return "Developing";
  if (total <= 85) return "Fit";
  return "Advanced";
}

export function scoreAssessment(answers: AssessmentAnswers): AssessmentResult {
  const { score: bmiPoints, bmi } = bmiScore(answers.heightCm, answers.weightKg);
  const activity = activityScore(answers);
  const physical = physicalScore(answers);
  const lifestyle = lifestyleScore(answers);

  const breakdown: ScoreBreakdown = { bmi: bmiPoints, activity, physical, lifestyle };

  // Physical performance skipped: rescale the other 75 points up to 100
  // rather than capping every score at 75 for anyone who skips it.
  const rawTotal = bmiPoints + activity + lifestyle + (physical ?? 0);
  const total = Math.round(physical === null ? (rawTotal * 100) / 75 : rawTotal);
  const clamped = Math.min(100, Math.max(0, total));

  const band = bandForScore(clamped);

  // A health condition or an injury/physical-limitation barrier always
  // points at 1-on-1 and surfaces the physician disclaimer, regardless of
  // what the point total alone would suggest — a group class is the wrong
  // default for someone managing an injury.
  const healthFlag =
    answers.goal === "health_condition" || answers.barrier === "injury";

  const tierNudge = healthFlag || band === "Fit" || band === "Advanced"
    ? "one_to_one"
    : "group";

  return {
    total: clamped,
    band,
    bandCopy: BAND_COPY[band],
    breakdown,
    tierNudge,
    healthFlag,
    bmi,
  };
}
