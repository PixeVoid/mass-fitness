-- Mass Fitness — drop the Squad tier, make prices admin-editable.
--
-- Two changes:
--   1. Squad is retired. Group and One-to-one are the only tiers now sold —
--      see BUILD_PLAN pricing note, 2026-07-29. No live subscriptions exist
--      yet (Phase 3/PhonePe hasn't shipped), so the constraint can just be
--      narrowed rather than migrated data.
--   2. Prices move out of committed code and into two small tables an admin
--      can edit from /admin/pricing, without a deploy. `plans.ts` keeps the
--      tier metadata (label, summary, copy) and the amortisation math — only
--      the numbers themselves (monthly price per tier, discount per
--      duration) now live in the database, with code-level fallback defaults
--      if these tables are ever empty (e.g. a fresh project before seeding).
--
-- Idempotent, like 0001-0003.

alter table public.subscriptions drop constraint if exists subscriptions_plan_tier_check;
alter table public.subscriptions add constraint subscriptions_plan_tier_check
  check (plan_tier in ('group', 'one_to_one'));

-- ---------------------------------------------------------------------------
-- plan_prices
-- ---------------------------------------------------------------------------
-- One row per tier. Publicly readable — the marketing landing page renders
-- this for anonymous visitors, same reasoning as `classes: public read`.
create table if not exists public.plan_prices (
  tier         text primary key check (tier in ('group', 'one_to_one')),
  monthly_paise integer not null check (monthly_paise >= 0),
  updated_at   timestamptz not null default now()
);

drop trigger if exists plan_prices_touch_updated_at on public.plan_prices;
create trigger plan_prices_touch_updated_at
  before update on public.plan_prices
  for each row execute function public.touch_updated_at();

alter table public.plan_prices enable row level security;

drop policy if exists "plan_prices: public read" on public.plan_prices;
create policy "plan_prices: public read"
  on public.plan_prices for select
  to anon, authenticated
  using (true);

drop policy if exists "plan_prices: admin write" on public.plan_prices;
create policy "plan_prices: admin write"
  on public.plan_prices for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.plan_prices (tier, monthly_paise) values
  ('group', 250000),
  ('one_to_one', 500000)
on conflict (tier) do nothing;

-- ---------------------------------------------------------------------------
-- plan_duration_discounts
-- ---------------------------------------------------------------------------
-- Quarterly/annual are the monthly price x months x (1 - discount) — one
-- discount fraction per duration, shared across tiers. `price_confirmed`
-- keeps `assertChargeable()` (Phase 3) from billing a rate nobody signed off
-- on; both longer durations are confirmed here since this migration is what
-- makes them real, admin-set numbers rather than placeholders.
create table if not exists public.plan_duration_discounts (
  duration        text primary key check (duration in ('monthly', 'quarterly', 'annual')),
  discount        numeric not null check (discount >= 0 and discount < 1),
  price_confirmed boolean not null default true,
  updated_at      timestamptz not null default now()
);

drop trigger if exists plan_duration_discounts_touch_updated_at on public.plan_duration_discounts;
create trigger plan_duration_discounts_touch_updated_at
  before update on public.plan_duration_discounts
  for each row execute function public.touch_updated_at();

alter table public.plan_duration_discounts enable row level security;

drop policy if exists "plan_duration_discounts: public read" on public.plan_duration_discounts;
create policy "plan_duration_discounts: public read"
  on public.plan_duration_discounts for select
  to anon, authenticated
  using (true);

drop policy if exists "plan_duration_discounts: admin write" on public.plan_duration_discounts;
create policy "plan_duration_discounts: admin write"
  on public.plan_duration_discounts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.plan_duration_discounts (duration, discount, price_confirmed) values
  ('monthly', 0, true),
  ('quarterly', 0.10, true),
  ('annual', 0.20, true)
on conflict (duration) do nothing;
