import { describe, expect, it } from "vitest";
import { scoreAssessment } from "@/lib/assessment/scoring";
import type { AssessmentAnswers } from "@/lib/assessment/types";

/** The number a stranger is shown about their own body. It has to be sane. */

const baseline: AssessmentAnswers = {
  age: 30,
  gender: "male",
  heightCm: 175,
  weightKg: 72,
  goal: "general_fitness",
  barrier: "time",
  activityLevel: "moderate",
  routine: "occasional",
  sleepHours: "7_8",
  diet: "home_cooked",
  dietaryPreference: "vegetarian",
  toeTouch: "yes",
  pushups: "16_25",
  squats30s: "20_30",
  stairsBreath: "barely_winded",
};

function sumBreakdown(breakdown: {
  bmi: number;
  activity: number;
  physical: number | null;
  lifestyle: number;
}): number {
  return (
    breakdown.bmi + breakdown.activity + breakdown.lifestyle + (breakdown.physical ?? 0)
  );
}

describe("scoreAssessment", () => {
  it("stays within 0-100 across a wide spread of answers", () => {
    const extremes: AssessmentAnswers[] = [
      baseline,
      { ...baseline, activityLevel: "sedentary", routine: "none",
        sleepHours: "under_5", diet: "irregular", toeTouch: "no",
        pushups: "0_5", squats30s: "under_10", stairsBreath: "very_winded" },
      { ...baseline, activityLevel: "very_active", routine: "progressing",
        sleepHours: "8_plus", diet: "home_cooked", toeTouch: "yes",
        pushups: "25_plus", squats30s: "30_plus", stairsBreath: "not_at_all" },
      { ...baseline, age: 13, weightKg: 30, heightCm: 100 },
      { ...baseline, age: 100, weightKg: 300, heightCm: 250 },
    ];

    for (const answers of extremes) {
      const result = scoreAssessment(answers);
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.total)).toBe(true);
    }
  });

  it("scores a fit person above an unfit one", () => {
    const unfit = scoreAssessment({
      ...baseline, activityLevel: "sedentary", routine: "none",
      sleepHours: "under_5", diet: "irregular", toeTouch: "no",
      pushups: "0_5", squats30s: "under_10", stairsBreath: "very_winded",
    });
    const fit = scoreAssessment({
      ...baseline, activityLevel: "very_active", routine: "progressing",
      sleepHours: "8_plus", diet: "home_cooked", toeTouch: "yes",
      pushups: "25_plus", squats30s: "30_plus", stairsBreath: "not_at_all",
    });
    expect(fit.total).toBeGreaterThan(unfit.total);
  });

  it("survives every optional fitness answer being skipped", () => {
    const skipped = { ...baseline };
    delete skipped.toeTouch;
    delete skipped.pushups;
    delete skipped.squats30s;
    delete skipped.stairsBreath;

    const result = scoreAssessment(skipped);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.band).toBeTruthy();
  });

  it("always recommends a tier we actually sell", () => {
    expect(["group", "one_to_one"]).toContain(
      scoreAssessment(baseline).tierNudge,
    );
  });

  it("computes a plausible BMI", () => {
    const result = scoreAssessment(baseline);
    // 72kg at 1.75m is 23.5
    expect(result.bmi).toBeGreaterThan(22);
    expect(result.bmi).toBeLessThan(25);
  });

  it("flags a declared health condition", () => {
    const result = scoreAssessment({ ...baseline, goal: "health_condition" });
    expect(result.healthFlag).toBe(true);
  });

  it("returns a breakdown whose parts add up to the total", () => {
    // The result screen and the PDF both show the parts *and* the total. If
    // they disagree, a member is told two different things about the same
    // answers. Allowing 1 point of rounding slack, no more.
    const result = scoreAssessment(baseline);
    const summed = sumBreakdown(result.breakdown);
    expect(Math.abs(summed - result.total)).toBeLessThanOrEqual(1);
  });

  it("keeps the parts adding up when the fitness questions are skipped", () => {
    // The bug: skipping rescaled the headline from 75 to 100 but left the bars
    // on the old scale, so three bars summing to 63 sat under a score of 84.
    const skipped = { ...baseline };
    delete skipped.toeTouch;
    delete skipped.pushups;
    delete skipped.squats30s;
    delete skipped.stairsBreath;

    const result = scoreAssessment(skipped);
    expect(result.breakdown.physical).toBeNull();
    expect(Math.abs(sumBreakdown(result.breakdown) - result.total))
      .toBeLessThanOrEqual(1);
  });

  it("never reports a part above the maximum it is printed against", () => {
    // Both the result screen and the PDF render each part as "value / partMax"
    // with a bar filled to that ratio. A value over its own max overflows the
    // bar and reads as a broken score.
    const withSkips = { ...baseline };
    delete withSkips.toeTouch;
    delete withSkips.pushups;
    delete withSkips.squats30s;
    delete withSkips.stairsBreath;

    for (const answers of [baseline, withSkips]) {
      const result = scoreAssessment(answers);
      for (const value of Object.values(result.breakdown)) {
        if (value !== null) expect(value).toBeLessThanOrEqual(result.partMax);
      }
    }
  });

  it("scores four parts out of 25, or three out of 33.3", () => {
    expect(scoreAssessment(baseline).partMax).toBe(25);

    const skipped = { ...baseline };
    delete skipped.toeTouch;
    delete skipped.pushups;
    delete skipped.squats30s;
    delete skipped.stairsBreath;
    expect(scoreAssessment(skipped).partMax).toBeCloseTo(33.3, 1);
  });
});
