import type { PlanTier } from "@/lib/db-types";

/**
 * Answer shape for the 15-question self-assessment. Every field is the raw
 * choice value (or number), never a score — scoring is derived separately
 * (`scoring.ts`) so the same answers can be re-scored if the bands ever
 * change without re-asking anyone.
 */
export interface AssessmentAnswers {
  age: number;
  gender: "male" | "female" | "unspecified";
  heightCm: number;
  weightKg: number;

  goal:
    | "lose_weight"
    | "build_muscle"
    | "general_fitness"
    | "stamina"
    | "health_condition";
  barrier:
    | "time"
    | "motivation"
    | "no_structure"
    | "no_results_before"
    | "injury";

  activityLevel: "sedentary" | "light" | "moderate" | "very_active";
  routine: "none" | "occasional" | "plateaued" | "progressing";
  sleepHours: "under_5" | "5_6" | "7_8" | "8_plus";

  diet: "home_cooked" | "mixed" | "mostly_outside" | "irregular";
  dietaryPreference: "vegetarian" | "non_vegetarian" | "eggetarian" | "vegan";

  /** Section 5 is optional in the UI — undefined means "skipped". */
  toeTouch?: "yes" | "difficulty" | "no";
  pushups?: "0_5" | "6_15" | "16_25" | "25_plus";
  squats30s?: "under_10" | "10_20" | "20_30" | "30_plus";
  stairsBreath?: "very_winded" | "somewhat_winded" | "barely_winded" | "not_at_all";
}

export interface ScoreBreakdown {
  bmi: number;
  activity: number;
  physical: number | null;
  lifestyle: number;
}

export type ResultBand = "Beginner" | "Developing" | "Fit" | "Advanced";

export interface AssessmentResult {
  total: number;
  band: ResultBand;
  bandCopy: string;
  breakdown: ScoreBreakdown;
  tierNudge: PlanTier;
  /** Set when the goal or barrier flags a health condition/injury — the
   * result screen shows a physician disclaimer and always nudges 1-on-1,
   * regardless of what the score alone would suggest. */
  healthFlag: boolean;
  bmi: number;
}
