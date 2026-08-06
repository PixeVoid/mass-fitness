import "server-only";

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import {
  ACTIVITY_LEVEL_LABELS,
  BARRIER_LABELS,
  DIETARY_PREFERENCE_LABELS,
  DIET_LABELS,
  GOAL_LABELS,
  PUSHUP_LABELS,
  ROUTINE_LABELS,
  SLEEP_LABELS,
  SQUAT_LABELS,
  STAIRS_LABELS,
  TIER_LABELS,
  TOE_TOUCH_LABELS,
} from "./labels";
import type { AssessmentAnswers, AssessmentResult } from "./types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#121212" },
  brand: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  tagline: { fontSize: 10, color: "#6b6b6b", marginBottom: 24 },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 4 },
  scoreNumber: { fontSize: 44, fontWeight: 700 },
  scoreOutOf: { fontSize: 14, color: "#6b6b6b", marginLeft: 6, marginBottom: 8 },
  band: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  bandCopy: { fontSize: 11, color: "#6b6b6b", marginBottom: 20 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b6b6b",
    marginTop: 18,
    marginBottom: 8,
    borderTop: "1px solid #e5e5e5",
    paddingTop: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  rowLabel: { color: "#6b6b6b" },
  rowValue: { fontWeight: 500 },
  breakdownBar: { flexDirection: "row", height: 6, backgroundColor: "#f0efec", borderRadius: 3, marginBottom: 3 },
  breakdownFill: { height: 6, backgroundColor: "#121212", borderRadius: 3 },
  nudge: {
    marginTop: 20,
    padding: 14,
    backgroundColor: "#f7f6f4",
    borderRadius: 8,
  },
  nudgeTitle: { fontWeight: 700, marginBottom: 4 },
  disclaimer: { marginTop: 24, fontSize: 9, color: "#9a9a9a", lineHeight: 1.4 },
});

function Bar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View style={styles.breakdownBar}>
      <View style={[styles.breakdownFill, { width: `${pct}%` }]} />
    </View>
  );
}

/** "20.0 / 25" — the maximum loses its decimal when it does not need one. */
function partLabel(value: number, max: number): string {
  return `${value.toFixed(1)} / ${max.toFixed(max % 1 === 0 ? 0 : 1)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function AssessmentReportDocument({
  name,
  answers,
  result,
}: {
  name: string;
  answers: AssessmentAnswers;
  result: AssessmentResult;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>MASS FITNESS</Text>
        <Text style={styles.tagline}>Fitness from home — self-assessment report</Text>

        <Text style={{ marginBottom: 16 }}>Hi {name}, here&apos;s where you stand today.</Text>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreNumber}>{result.total}</Text>
          <Text style={styles.scoreOutOf}>/ 100</Text>
        </View>
        <Text style={styles.band}>{result.band}</Text>
        <Text style={styles.bandCopy}>{result.bandCopy}</Text>

        {/* `partMax` rather than a hard 25: when the physical-performance
            questions are skipped, three parts cover the same 100 points and
            both the values and their maximum scale together. Printing a
            rescaled value against a fixed "/ 25" made bars overflow. */}
        <Text style={styles.sectionTitle}>Score breakdown</Text>
        <Row label="BMI" value={partLabel(result.breakdown.bmi, result.partMax)} />
        <Bar value={result.breakdown.bmi} max={result.partMax} />
        <Row label="Activity" value={partLabel(result.breakdown.activity, result.partMax)} />
        <Bar value={result.breakdown.activity} max={result.partMax} />
        {result.breakdown.physical !== null && (
          <>
            <Row label="Physical performance" value={partLabel(result.breakdown.physical, result.partMax)} />
            <Bar value={result.breakdown.physical} max={result.partMax} />
          </>
        )}
        <Row label="Lifestyle" value={partLabel(result.breakdown.lifestyle, result.partMax)} />
        <Bar value={result.breakdown.lifestyle} max={result.partMax} />

        <Text style={styles.sectionTitle}>Your answers</Text>
        <Row label="Age" value={String(answers.age)} />
        <Row label="Height / Weight" value={`${answers.heightCm} cm / ${answers.weightKg} kg (BMI ${result.bmi})`} />
        <Row label="Goal" value={GOAL_LABELS[answers.goal]} />
        <Row label="Biggest barrier" value={BARRIER_LABELS[answers.barrier]} />
        <Row label="Activity level" value={ACTIVITY_LEVEL_LABELS[answers.activityLevel]} />
        <Row label="Current routine" value={ROUTINE_LABELS[answers.routine]} />
        <Row label="Sleep" value={SLEEP_LABELS[answers.sleepHours]} />
        <Row label="Diet pattern" value={DIET_LABELS[answers.diet]} />
        <Row label="Dietary preference" value={DIETARY_PREFERENCE_LABELS[answers.dietaryPreference]} />
        {answers.toeTouch && (
          <Row label="Toe touch" value={TOE_TOUCH_LABELS[answers.toeTouch]} />
        )}
        {answers.pushups && (
          <Row label="Push-ups (one go)" value={PUSHUP_LABELS[answers.pushups]} />
        )}
        {answers.squats30s && (
          <Row label="Bodyweight squats (30s)" value={SQUAT_LABELS[answers.squats30s]} />
        )}
        {answers.stairsBreath && (
          <Row label="After 2 flights of stairs" value={STAIRS_LABELS[answers.stairsBreath]} />
        )}

        <View style={styles.nudge}>
          <Text style={styles.nudgeTitle}>Recommended: {TIER_LABELS[result.tierNudge]}</Text>
          <Text>
            {result.tierNudge === "one_to_one"
              ? "A dedicated coach, one session at a time — the right fit given what you told us."
              : "Coached sessions with others working toward the same thing — structure and accountability to start."}
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          This is a general fitness self-assessment, not a medical evaluation.
          {result.healthFlag
            ? " Please consult a physician before starting any exercise programme, given what you shared about your health or an injury."
            : " Consult a physician before starting any new exercise programme."}
          {" "}Mass Fitness · fitnessbymass@gmail.com · +91 62075 24549
        </Text>
      </Page>
    </Document>
  );
}

export async function renderAssessmentReportPdf(args: {
  name: string;
  answers: AssessmentAnswers;
  result: AssessmentResult;
}): Promise<Buffer> {
  return renderToBuffer(<AssessmentReportDocument {...args} />);
}
