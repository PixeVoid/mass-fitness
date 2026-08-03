-- Mass Fitness — scored self-assessment columns on leads.
--
-- The "Get your AI assessment" flow moves from a free-form chat to a fixed
-- 15-question quiz with a computed 0-100 score (see src/lib/assessment/).
-- These columns hold that result so /admin/leads can show it instead of just
-- a chat excerpt. All nullable: existing rows from the old chat flow, and any
-- future lead source that isn't the quiz, simply leave them null.
--
-- Idempotent, like 0001-0004.

alter table public.leads add column if not exists score int
  check (score is null or (score >= 0 and score <= 100));
alter table public.leads add column if not exists band text;
alter table public.leads add column if not exists tier_nudge text
  check (tier_nudge is null or tier_nudge in ('group', 'one_to_one'));
alter table public.leads add column if not exists answers jsonb;

comment on column public.leads.score is
  'Total self-assessment score, 0-100. Null for leads not from the scored quiz.';
comment on column public.leads.band is
  'Result band label at the time of scoring (e.g. "Developing"), stored rather than re-derived so it never drifts if the band thresholds change later.';
comment on column public.leads.tier_nudge is
  'Which plan the result screen pointed the lead toward.';
comment on column public.leads.answers is
  'Raw quiz answers, keyed by question id — support context, same role summary played for the old chat flow.';
