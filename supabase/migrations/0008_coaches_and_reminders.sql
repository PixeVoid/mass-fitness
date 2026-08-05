-- ---------------------------------------------------------------------------
-- 0008 — trainers schedule their own classes, and class reminders
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Trainer-managed classes
-- ---------------------------------------------------------------------------
-- Until now `classes` was admin-write only, so a coach had to message an admin
-- to get every session on the calendar. That does not survive a real timetable.
--
-- The boundary is **ownership**: a trainer may schedule and edit classes that
-- are theirs, and cannot touch one that is not. Everything genuinely dangerous
-- — roles, subscriptions, pricing, leads, the member list — has no trainer
-- policy at all and stays behind /admin.
--
-- Note what is deliberately absent: a delete policy. Trainers cancel, which
-- leaves the row visible and marked cancelled, so a member who planned around
-- a session can see it was called off. A class that simply vanished would look
-- to them like they had imagined it. Permanent deletion stays with admins.

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('trainer', 'admin')
  );
$$;

comment on function public.is_coach() is
  'True for trainers and admins — anyone who may run a class.';

-- `with check` is what stops a trainer scheduling into a colleague's calendar.
drop policy if exists "classes: coach creates own" on public.classes;
create policy "classes: coach creates own"
  on public.classes for insert
  to authenticated
  with check (public.is_coach() and trainer_id = auth.uid());

-- Theirs before, and theirs after. Without the second half a trainer could
-- hand a class to someone else, or take one over by reassigning it.
drop policy if exists "classes: coach updates own" on public.classes;
create policy "classes: coach updates own"
  on public.classes for update
  to authenticated
  using (public.is_coach() and trainer_id = auth.uid())
  with check (public.is_coach() and trainer_id = auth.uid());

-- The existing "classes: admin write" policy is untouched and still covers
-- admins for all four verbs. Postgres ORs permissive policies together, so an
-- admin passes via that one whoever a class belongs to.

-- ---------------------------------------------------------------------------
-- Class reminders
-- ---------------------------------------------------------------------------
-- One row per (class, member) reminder actually sent.
--
-- This table is the idempotency guard, not a log written afterwards. The
-- sender inserts first and only emails the rows the insert actually created,
-- so two overlapping cron runs — or one that is retried after timing out
-- halfway — cannot email the same person twice. Getting reminded about a class
-- you already know about is annoying; getting reminded four times is a reason
-- to unsubscribe.
create table if not exists public.class_reminders (
  class_id   uuid not null references public.classes (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  -- Named rather than implied, so a second kind of reminder can be added later
  -- without every existing row silently becoming ambiguous.
  kind       text not null default 'starting_soon',
  sent_at    timestamptz not null default now(),
  primary key (class_id, user_id, kind)
);

create index if not exists class_reminders_sent_idx
  on public.class_reminders (sent_at desc);

alter table public.class_reminders enable row level security;

-- No policy for anyone. Only the service-role sender touches this table, and
-- it bypasses RLS — so an empty policy set is the correct, restrictive answer
-- rather than an oversight. Admins read it through the service role too.
