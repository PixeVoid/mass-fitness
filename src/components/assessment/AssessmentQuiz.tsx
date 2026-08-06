"use client";

import { useState } from "react";
import Link from "next/link";
import type { AssessmentAnswers } from "@/lib/assessment/types";
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
} from "@/lib/assessment/labels";

type Draft = Partial<AssessmentAnswers>;

interface LeadInfo {
  name: string;
  phone: string;
  email: string;
}

interface SubmitResult {
  score: number;
  band: string;
  bandCopy: string;
  breakdown: { bmi: number; activity: number; physical: number | null; lifestyle: number };
  partMax: number;
  tierNudge: "group" | "one_to_one";
  healthFlag: boolean;
  bmi: number;
  emailSent: boolean;
  pdfBase64: string | null;
  whatsappUrl: string;
}

const STEP_COUNT = 6; // basics, goal, activity, diet, physical (optional), contact

export default function AssessmentQuiz() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [lead, setLead] = useState<LeadInfo>({ name: "", phone: "", email: "" });
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  function update<K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          phone: lead.phone,
          email: lead.email || undefined,
          answers: draft,
          company,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        if (res.status === 429) {
          setError("Too many attempts — please try again in a few minutes.");
        } else if (typeof data?.error === "string" && res.status === 400) {
          setError("Check your details and try again.");
        } else {
          setError("Couldn't send that — please try again.");
        }
        setStatus("error");
        return;
      }

      setResult(data as SubmitResult);
      setStatus("idle");
    } catch {
      setError("Couldn't send that — check your connection and try again.");
      setStatus("error");
    }
  }

  if (result) {
    return <ResultScreen name={lead.name} result={result} />;
  }

  return (
    <div className="panel mx-auto max-w-xl rounded-2xl p-6 sm:p-8">
      <Progress step={step} />

      {step === 0 && (
        <BasicsStep
          draft={draft}
          update={update}
          name={lead.name}
          setName={(name) => setLead({ ...lead, name })}
          onNext={next}
        />
      )}
      {step === 1 && (
        <GoalStep draft={draft} update={update} onNext={next} onBack={back} />
      )}
      {step === 2 && (
        <ActivityStep draft={draft} update={update} onNext={next} onBack={back} />
      )}
      {step === 3 && (
        <DietStep draft={draft} update={update} onNext={next} onBack={back} />
      )}
      {step === 4 && (
        <PhysicalStep draft={draft} update={update} onNext={next} onBack={back} />
      )}
      {step === 5 && (
        <ContactStep
          lead={lead}
          setLead={setLead}
          company={company}
          setCompany={setCompany}
          onBack={back}
          onSubmit={submit}
          sending={status === "sending"}
          error={error}
        />
      )}
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-8 flex items-center gap-1.5">
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <span
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            i <= step ? "bg-ink" : "bg-line"
          }`}
        />
      ))}
    </div>
  );
}

function StepNav({
  onNext,
  onBack,
  disabled,
  nextLabel = "Continue",
}: {
  onNext: () => void;
  onBack?: () => void;
  disabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-8 flex items-center gap-3">
      {onBack && (
        <button type="button" onClick={onBack} className="btn btn-outline">
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className="btn btn-solid flex-1 disabled:opacity-50"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`rounded-xl border px-4 py-3 text-left text-[0.9375rem] transition-colors duration-200 ${
            value === opt.value
              ? "border-ink bg-ink text-paper"
              : "border-line-strong text-ink hover:bg-overlay"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StepHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="label text-faint">{label}</p>
      <h2 className="display-sm mt-2 text-[1.5rem] text-ink">{title}</h2>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — basics
// ---------------------------------------------------------------------------

function BasicsStep({
  draft,
  update,
  name,
  setName,
  onNext,
}: {
  draft: Draft;
  update: <K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K]) => void;
  name: string;
  setName: (name: string) => void;
  onNext: () => void;
}) {
  const valid =
    name.trim().length > 0 &&
    !!draft.age && draft.age >= 13 && draft.age <= 100 &&
    !!draft.gender &&
    !!draft.heightCm && draft.heightCm >= 100 && draft.heightCm <= 250 &&
    !!draft.weightKg && draft.weightKg >= 30 && draft.weightKg <= 300;

  return (
    <div>
      <StepHeading label="Section 1 of 5" title="The basics" />

      <div className="flex flex-col gap-5">
        {/* Asked first, and only once. It used to be the very last thing
            before submitting, which meant five sections of questions from a
            stranger who had never been greeted by name — and the one field
            that lets every screen after this address the person directly. */}
        <div>
          <label htmlFor="lead-name" className="field-label">Your name</label>
          <input
            id="lead-name"
            className="field"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ankit"
          />
        </div>

        <div>
          <label htmlFor="age" className="field-label">Age</label>
          <input
            id="age"
            type="number"
            inputMode="numeric"
            min={13}
            max={100}
            className="field"
            value={draft.age ?? ""}
            onChange={(e) => update("age", Number(e.target.value))}
          />
        </div>

        <div>
          <p className="field-label">Gender</p>
          <ChoiceGroup
            value={draft.gender}
            onChange={(v) => update("gender", v)}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "unspecified", label: "Prefer not to say" },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="heightCm" className="field-label">Height (cm)</label>
            <input
              id="heightCm"
              type="number"
              inputMode="decimal"
              min={100}
              max={250}
              className="field"
              value={draft.heightCm ?? ""}
              onChange={(e) => update("heightCm", Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="weightKg" className="field-label">Weight (kg)</label>
            <input
              id="weightKg"
              type="number"
              inputMode="decimal"
              min={30}
              max={300}
              className="field"
              value={draft.weightKg ?? ""}
              onChange={(e) => update("weightKg", Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <StepNav onNext={onNext} disabled={!valid} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — goal & motivation
// ---------------------------------------------------------------------------

function GoalStep({
  draft,
  update,
  onNext,
  onBack,
}: {
  draft: Draft;
  update: <K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const valid = !!draft.goal && !!draft.barrier;

  return (
    <div>
      <StepHeading label="Section 2 of 5" title="Goal & motivation" />

      <div className="flex flex-col gap-6">
        <div>
          <p className="field-label">What&rsquo;s your primary fitness goal?</p>
          <ChoiceGroup
            value={draft.goal}
            onChange={(v) => update("goal", v)}
            options={(Object.keys(GOAL_LABELS) as (keyof typeof GOAL_LABELS)[]).map(
              (value) => ({ value, label: GOAL_LABELS[value] }),
            )}
          />
        </div>

        <div>
          <p className="field-label">What&rsquo;s stopping you the most right now?</p>
          <ChoiceGroup
            value={draft.barrier}
            onChange={(v) => update("barrier", v)}
            options={(Object.keys(BARRIER_LABELS) as (keyof typeof BARRIER_LABELS)[]).map(
              (value) => ({ value, label: BARRIER_LABELS[value] }),
            )}
          />
        </div>
      </div>

      <StepNav onNext={onNext} onBack={onBack} disabled={!valid} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — current activity & habits
// ---------------------------------------------------------------------------

function ActivityStep({
  draft,
  update,
  onNext,
  onBack,
}: {
  draft: Draft;
  update: <K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const valid = !!draft.activityLevel && !!draft.routine && !!draft.sleepHours;

  return (
    <div>
      <StepHeading label="Section 3 of 5" title="Activity & habits" />

      <div className="flex flex-col gap-6">
        <div>
          <p className="field-label">Current activity level</p>
          <ChoiceGroup
            value={draft.activityLevel}
            onChange={(v) => update("activityLevel", v)}
            options={(
              Object.keys(ACTIVITY_LEVEL_LABELS) as (keyof typeof ACTIVITY_LEVEL_LABELS)[]
            ).map((value) => ({ value, label: ACTIVITY_LEVEL_LABELS[value] }))}
          />
        </div>

        <div>
          <p className="field-label">Do you follow a workout routine?</p>
          <ChoiceGroup
            value={draft.routine}
            onChange={(v) => update("routine", v)}
            options={(Object.keys(ROUTINE_LABELS) as (keyof typeof ROUTINE_LABELS)[]).map(
              (value) => ({ value, label: ROUTINE_LABELS[value] }),
            )}
          />
        </div>

        <div>
          <p className="field-label">Hours of sleep, typically</p>
          <ChoiceGroup
            value={draft.sleepHours}
            onChange={(v) => update("sleepHours", v)}
            options={(Object.keys(SLEEP_LABELS) as (keyof typeof SLEEP_LABELS)[]).map(
              (value) => ({ value, label: SLEEP_LABELS[value] }),
            )}
          />
        </div>
      </div>

      <StepNav onNext={onNext} onBack={onBack} disabled={!valid} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 4 — diet
// ---------------------------------------------------------------------------

function DietStep({
  draft,
  update,
  onNext,
  onBack,
}: {
  draft: Draft;
  update: <K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const valid = !!draft.diet && !!draft.dietaryPreference;

  return (
    <div>
      <StepHeading label="Section 4 of 5" title="Diet pattern" />

      <div className="flex flex-col gap-6">
        <div>
          <p className="field-label">Which best describes your eating habits?</p>
          <ChoiceGroup
            value={draft.diet}
            onChange={(v) => update("diet", v)}
            options={(Object.keys(DIET_LABELS) as (keyof typeof DIET_LABELS)[]).map(
              (value) => ({ value, label: DIET_LABELS[value] }),
            )}
          />
        </div>

        <div>
          <p className="field-label">Dietary preference</p>
          <ChoiceGroup
            value={draft.dietaryPreference}
            onChange={(v) => update("dietaryPreference", v)}
            options={(
              Object.keys(DIETARY_PREFERENCE_LABELS) as (keyof typeof DIETARY_PREFERENCE_LABELS)[]
            ).map((value) => ({ value, label: DIETARY_PREFERENCE_LABELS[value] }))}
          />
        </div>
      </div>

      <StepNav onNext={onNext} onBack={onBack} disabled={!valid} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 5 — physical self-test (optional)
// ---------------------------------------------------------------------------

function PhysicalStep({
  draft,
  update,
  onNext,
  onBack,
}: {
  draft: Draft;
  update: <K extends keyof AssessmentAnswers>(key: K, value: AssessmentAnswers[K]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <StepHeading label="Section 5 of 5 — optional" title="Quick physical self-test" />
      <p className="mb-6 text-[0.875rem] text-muted">
        Skip this if you&rsquo;d rather not — your score adjusts automatically.
      </p>

      <div className="flex flex-col gap-6">
        <div>
          <p className="field-label">Can you touch your toes without bending your knees?</p>
          <ChoiceGroup
            value={draft.toeTouch}
            onChange={(v) => update("toeTouch", v)}
            options={(Object.keys(TOE_TOUCH_LABELS) as (keyof typeof TOE_TOUCH_LABELS)[]).map(
              (value) => ({ value, label: TOE_TOUCH_LABELS[value] }),
            )}
          />
        </div>

        <div>
          <p className="field-label">Push-ups in one go (any style)</p>
          <ChoiceGroup
            value={draft.pushups}
            onChange={(v) => update("pushups", v)}
            options={(Object.keys(PUSHUP_LABELS) as (keyof typeof PUSHUP_LABELS)[]).map(
              (value) => ({ value, label: PUSHUP_LABELS[value] }),
            )}
          />
        </div>

        <div>
          <p className="field-label">Bodyweight squats in 30 seconds</p>
          <ChoiceGroup
            value={draft.squats30s}
            onChange={(v) => update("squats30s", v)}
            options={(Object.keys(SQUAT_LABELS) as (keyof typeof SQUAT_LABELS)[]).map(
              (value) => ({ value, label: SQUAT_LABELS[value] }),
            )}
          />
        </div>

        <div>
          <p className="field-label">After climbing 2 flights of stairs, how winded do you feel?</p>
          <ChoiceGroup
            value={draft.stairsBreath}
            onChange={(v) => update("stairsBreath", v)}
            options={(Object.keys(STAIRS_LABELS) as (keyof typeof STAIRS_LABELS)[]).map(
              (value) => ({ value, label: STAIRS_LABELS[value] }),
            )}
          />
        </div>
      </div>

      <StepNav onNext={onNext} onBack={onBack} nextLabel="Continue" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contact — lead capture, shown before results
// ---------------------------------------------------------------------------

function ContactStep({
  lead,
  setLead,
  company,
  setCompany,
  onBack,
  onSubmit,
  sending,
  error,
}: {
  lead: LeadInfo;
  setLead: (lead: LeadInfo) => void;
  company: string;
  setCompany: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  sending: boolean;
  error: string | null;
}) {
  const valid = lead.name.trim().length > 0 && lead.phone.trim().length > 0;

  return (
    <div>
      {/* Name is collected in section 1 now, so this step greets rather than
          asks again — and `valid` still checks it, because a blank name here
          means something upstream went wrong, not that we should send it. */}
      <StepHeading
        label="Almost there"
        title={
          lead.name.trim()
            ? `${lead.name.trim().split(/\s+/)[0]}, your score is ready`
            : "Your fitness score is ready"
        }
      />
      <p className="mb-6 text-[0.875rem] text-muted">
        Where should we send it? We&rsquo;ll show your results right away and
        email you a copy.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="lead-phone" className="field-label">Phone number (WhatsApp preferred)</label>
          <input
            id="lead-phone"
            className="field"
            inputMode="tel"
            value={lead.phone}
            onChange={(e) => setLead({ ...lead, phone: e.target.value })}
            placeholder="98765 43210"
          />
        </div>
        <div>
          <label htmlFor="lead-email" className="field-label">
            Email <span className="text-faint">(optional)</span>
          </label>
          <input
            id="lead-email"
            type="email"
            className="field"
            value={lead.email}
            onChange={(e) => setLead({ ...lead, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>

        {/* Honeypot — real visitors never see this field. */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        {error && <p className="field-error">{error}</p>}
      </div>

      <StepNav
        onNext={onSubmit}
        onBack={onBack}
        disabled={!valid || sending}
        nextLabel={sending ? "Scoring…" : "See my results"}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function BreakdownBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number | null;
  max: number;
}) {
  if (value === null) return null;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[0.8125rem]">
        <span className="text-muted">{label}</span>
        <span className="numeric text-faint">
          {value.toFixed(1)} / {max.toFixed(max % 1 === 0 ? 0 : 1)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk">
        <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ResultScreen({ name, result }: { name: string; result: SubmitResult }) {
  function downloadPdf() {
    if (!result.pdfBase64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${result.pdfBase64}`;
    link.download = "mass-fitness-assessment.pdf";
    link.click();
  }

  return (
    <div className="panel mx-auto max-w-xl rounded-2xl p-6 sm:p-8">
      <p className="label text-faint">Hi {name}</p>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="numeric text-6xl tracking-tight text-ink">{result.score}</span>
        <span className="label text-faint">/ 100</span>
      </div>
      <h2 className="display-sm mt-3 text-[1.75rem] text-ink">{result.band}</h2>
      <p className="mt-1 text-[0.9375rem] text-muted">{result.bandCopy}</p>

      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6">
        <BreakdownBar label="BMI" value={result.breakdown.bmi} max={result.partMax} />
        <BreakdownBar label="Activity" value={result.breakdown.activity} max={result.partMax} />
        <BreakdownBar label="Physical performance" value={result.breakdown.physical} max={result.partMax} />
        <BreakdownBar label="Lifestyle" value={result.breakdown.lifestyle} max={result.partMax} />
      </div>

      <div className="mt-8 rounded-xl bg-surface-sunk p-5">
        <p className="label text-faint">Recommended</p>
        <p className="display-sm mt-2 text-[1.375rem] text-ink">
          {TIER_LABELS[result.tierNudge]}
        </p>
        {result.healthFlag && (
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
            Please consult a physician before starting any exercise programme,
            given what you shared.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href={result.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-solid flex-1"
        >
          Continue on WhatsApp
        </a>
        {result.pdfBase64 && (
          <button type="button" onClick={downloadPdf} className="btn btn-outline flex-1">
            Download PDF
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-[0.8125rem] text-faint">
        {result.emailSent
          ? "We've also emailed a copy of your report."
          : "A coach will follow up on WhatsApp shortly."}
      </p>

      <Link href="/" className="link mt-6 block text-center text-[0.8125rem]">
        Back to Mass Fitness
      </Link>
    </div>
  );
}
