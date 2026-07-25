-- Mass Fitness — initial schema (BUILD_PLAN Section 1)
--
-- Run against a fresh Supabase project:
--   supabase db push
-- or paste into the SQL editor in the Supabase dashboard.
--
-- Everything here is idempotent so re-running against a partially-migrated
-- project is safe.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- One row per authenticated user. `id` mirrors auth.users so RLS can compare
-- against auth.uid() directly without a join.
--
-- `role` is not in the original plan but is load-bearing: the LiveKit token
-- route needs to know whether the caller may publish (trainer) and the admin
-- dashboard needs a server-checkable admin flag. Keeping it on profiles means
-- one lookup answers both.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text,
  phone        text unique,
  email        text,
  fitness_goal text,
  role         text not null default 'member'
                 check (role in ('member', 'trainer', 'admin')),
  onboarded_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.profiles.onboarded_at is
  'Set once name + goal capture completes. Null means send the user to /onboarding.';

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
-- Plans are tier x duration: the landing page sells three tiers, each of which
-- can be billed over three durations. Price is stored per row in paise rather
-- than looked up from the current catalogue, so changing prices later never
-- rewrites what an existing member was actually charged.
create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles (id) on delete cascade,
  plan_tier               text not null
                            check (plan_tier in ('group', 'one_to_one', 'squad')),
  plan_duration           text not null
                            check (plan_duration in ('monthly', 'quarterly', 'annual')),
  amount_paise            integer not null check (amount_paise >= 0),
  status                  text not null default 'pending'
                            check (status in ('pending', 'active', 'expired', 'cancelled')),
  phonepe_txn_id          text,
  phonepe_merchant_txn_id text unique,
  start_date              timestamptz,
  end_date                timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on column public.subscriptions.amount_paise is
  'Charged amount in paise (INR minor units). Integer avoids float rounding on money.';
comment on column public.subscriptions.phonepe_merchant_txn_id is
  'Our own idempotency key sent to PhonePe. Unique so a replayed callback cannot double-activate.';

-- The access check runs on every token mint and every gated page render, so it
-- gets a covering index rather than a plain user_id one.
create index if not exists subscriptions_active_lookup_idx
  on public.subscriptions (user_id, status, end_date desc);

-- ---------------------------------------------------------------------------
-- classes
-- ---------------------------------------------------------------------------
-- `trainer_id` is an addition to the original plan. Section 3.5 requires
-- deciding publish rights per class, and a free-text trainer_name cannot be
-- compared against auth.uid(). trainer_name stays as the display string.
create table if not exists public.classes (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  trainer_name     text,
  trainer_id       uuid references public.profiles (id) on delete set null,
  scheduled_at     timestamptz not null,
  duration_minutes integer not null default 45 check (duration_minutes > 0),
  livekit_room     text not null unique,
  is_premium       boolean not null default true,
  status           text not null default 'scheduled'
                     check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.classes.livekit_room is
  'Unique per class — the unique constraint is what stops two scheduled sessions colliding in one LiveKit room.';

create index if not exists classes_schedule_idx
  on public.classes (scheduled_at)
  where status in ('scheduled', 'live');

-- ---------------------------------------------------------------------------
-- chat_logs
-- ---------------------------------------------------------------------------
-- Written server-side only (service role), so support can see history. Logging
-- is off by default behind CHAT_LOG_ENABLED — see BUILD_PLAN open flag 3.
create table if not exists public.chat_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  message    text not null,
  response   text,
  created_at timestamptz not null default now()
);

create index if not exists chat_logs_user_idx
  on public.chat_logs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
-- A policy on profiles that reads profiles recurses forever. SECURITY DEFINER
-- runs the lookup with RLS bypassed, which breaks the cycle. `search_path` is
-- pinned because a definer function inherits the caller's otherwise.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Mirrors an auth.users row into profiles on signup, so a user always has a
-- profile row before any client code tries to read one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, phone, email)
  values (new.id, new.phone, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

drop trigger if exists classes_touch_updated_at on public.classes;
create trigger classes_touch_updated_at
  before update on public.classes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
-- The service-role key bypasses RLS entirely, so anything the app must write
-- on the user's behalf (subscription activation, chat logs) simply has no
-- client-facing write policy below. That is deliberate, not an omission.
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.classes       enable row level security;
alter table public.chat_logs     enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Role is intentionally not user-writable: a member could otherwise promote
-- themselves to trainer and mint publish-capable LiveKit tokens.
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- subscriptions -------------------------------------------------------------
-- Read-only to the owner. All writes go through the payment callback using the
-- service role, so a client cannot mark itself active.
drop policy if exists "subscriptions: read own" on public.subscriptions;
create policy "subscriptions: read own"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- classes -------------------------------------------------------------------
-- Publicly readable so the marketing schedule can render without a session.
drop policy if exists "classes: public read" on public.classes;
create policy "classes: public read"
  on public.classes for select
  to anon, authenticated
  using (true);

drop policy if exists "classes: admin write" on public.classes;
create policy "classes: admin write"
  on public.classes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- chat_logs -----------------------------------------------------------------
drop policy if exists "chat_logs: read own" on public.chat_logs;
create policy "chat_logs: read own"
  on public.chat_logs for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());
