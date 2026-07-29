import type { AssessmentAnswers } from "./types";

/**
 * Human-readable copy for each answer code — shared by the quiz UI, the PDF
 * report, and the WhatsApp/email summary text, so the wording only lives in
 * one place.
 */
export const GOAL_LABELS: Record<AssessmentAnswers["goal"], string> = {
  lose_weight: "Lose weight",
  build_muscle: "Build muscle",
  general_fitness: "General fitness & toning",
  stamina: "Improve stamina/energy",
  health_condition: "Manage a health condition",
};

export const BARRIER_LABELS: Record<AssessmentAnswers["barrier"], string> = {
  time: "Lack of time",
  motivation: "Lack of motivation/consistency",
  no_structure: "Don't know what to do",
  no_results_before: "Tried before, didn't see results",
  injury: "Injury or physical limitation",
};

export const ACTIVITY_LEVEL_LABELS: Record<AssessmentAnswers["activityLevel"], string> = {
  sedentary: "Sedentary",
  light: "Lightly active",
  moderate: "Moderately active",
  very_active: "Very active",
};

export const ROUTINE_LABELS: Record<AssessmentAnswers["routine"], string> = {
  none: "No routine at all",
  occasional: "Occasional/unstructured workouts",
  plateaued: "Regular but plateaued",
  progressing: "Regular and progressing well",
};

export const SLEEP_LABELS: Record<AssessmentAnswers["sleepHours"], string> = {
  under_5: "Less than 5 hrs",
  "5_6": "5-6 hrs",
  "7_8": "7-8 hrs",
  "8_plus": "8+ hrs",
};

export const DIET_LABELS: Record<AssessmentAnswers["diet"], string> = {
  home_cooked: "Mostly home-cooked, balanced meals",
  mixed: "Mix of home-cooked and outside food",
  mostly_outside: "Mostly outside/processed food",
  irregular: "Irregular/skipping meals often",
};

export const DIETARY_PREFERENCE_LABELS: Record<
  AssessmentAnswers["dietaryPreference"],
  string
> = {
  vegetarian: "Vegetarian",
  non_vegetarian: "Non-vegetarian",
  eggetarian: "Eggetarian",
  vegan: "Vegan",
};

export const TOE_TOUCH_LABELS: Record<
  NonNullable<AssessmentAnswers["toeTouch"]>,
  string
> = {
  yes: "Yes",
  difficulty: "With difficulty",
  no: "No",
};

export const PUSHUP_LABELS: Record<NonNullable<AssessmentAnswers["pushups"]>, string> = {
  "0_5": "0-5",
  "6_15": "6-15",
  "16_25": "16-25",
  "25_plus": "25+",
};

export const SQUAT_LABELS: Record<NonNullable<AssessmentAnswers["squats30s"]>, string> = {
  under_10: "Under 10",
  "10_20": "10-20",
  "20_30": "20-30",
  "30_plus": "30+",
};

export const STAIRS_LABELS: Record<
  NonNullable<AssessmentAnswers["stairsBreath"]>,
  string
> = {
  very_winded: "Very winded",
  somewhat_winded: "Somewhat winded",
  barely_winded: "Barely winded",
  not_at_all: "Not at all",
};

export const TIER_LABELS = {
  group: "Group",
  one_to_one: "One-to-one",
} as const;
