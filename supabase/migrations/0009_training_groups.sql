-- ---------------------------------------------------------------------------
-- 0009 — training groups
-- ---------------------------------------------------------------------------
-- Two problems, one table. Classes had no capacity, so a session built for ten
-- could have forty people in it; and every member saw every class, including
-- ones aimed at a completely different kind of training.
--
-- A group is a cohort, not a category: named people, one coach, a hard cap.
-- "Strength" as a category has no size limit and fixes neither problem.
--
-- One-to-one is **not** a separate system. It is a group with a capacity of 1
-- and its own coach. That means a private session is just a class targeted at
-- a group of one, and every downstream path — scheduling, reminders, the join
-- check, the dashboard — has one implementation rather than two.
-- ---------------------------------------------------------------------------

create table if not exists public.training_groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  -- Free text rather than an enum: adding a track should be a row, not a
  -- migration, and the set will change faster than the schema should.
  focus         text not null default 'General',
  trainer_id    uuid references public.profiles (id) on delete set null,
  kind          text not null default 'group'
                  check (kind in ('group', 'one_to_one')),
  capacity      integer not null default 12 check (capacity > 0),
  -- Descriptive only — "Mon/Wed/Fri 7:00am". The scheduled classes are the
  -- truth; this exists so a member choosing a group can see roughly when it
  -- runs before committing to it.
  schedule_hint text,
  -- Inactive groups keep their history and their members but stop being
  -- offered to anyone new.
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists training_groups_trainer_idx
  on public.training_groups (trainer_id) where active;

comment on table public.training_groups is
  'A cohort with one coach and a hard cap. kind=one_to_one is a cohort of one.';

create table if not exists public.group_members (
  group_id  uuid not null references public.training_groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Answers both "which groups is this member in" and "who joined recently",
-- which is what the coach's new-member list reads.
create index if not exists group_members_user_idx
  on public.group_members (user_id);
create index if not exists group_members_joined_idx
  on public.group_members (joined_at desc);

-- ---------------------------------------------------------------------------
-- Who a class is for
-- ---------------------------------------------------------------------------
-- `audience` is stored rather than derived from whether class_groups has rows.
-- Derived would be neater, but the failure mode is unacceptable: a coach who
-- forgets to pick a group on a one-to-one session would silently publish a
-- private class to the entire membership. An explicit column makes that a
-- constraint violation instead of a quiet leak.
alter table public.classes add column if not exists audience text not null
  default 'all' check (audience in ('all', 'groups'));

comment on column public.classes.audience is
  'all = every member; groups = only members of the groups in class_groups.';

create table if not exists public.class_groups (
  class_id uuid not null references public.classes (id) on delete cascade,
  group_id uuid not null references public.training_groups (id) on delete cascade,
  primary key (class_id, group_id)
);

create index if not exists class_groups_group_idx
  on public.class_groups (group_id);

-- How many one-to-one clients a coach will take. Zero by default: a trainer
-- has to be opted in before they can be picked, rather than every new coach
-- silently becoming available for private clients.
alter table public.profiles add column if not exists one_to_one_capacity integer
  not null default 0 check (one_to_one_capacity >= 0);

-- ---------------------------------------------------------------------------
-- Capacity, enforced in the database
-- ---------------------------------------------------------------------------
-- A count-then-insert in application code loses the race when two people take
-- the last slot at once: both count N-1, both insert, the group ends up over
-- cap. `for update` on the group row serialises them, so the second waits for
-- the first to commit and then sees the true count.
--
-- In a trigger rather than in the join action because it must hold for every
-- path — the member picking a group, an admin moving someone, a future import.
create or replace function public.enforce_group_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cap   integer;
  taken integer;
begin
  select capacity into cap
    from public.training_groups
   where id = new.group_id
     for update;

  if cap is null then
    raise exception 'group % does not exist', new.group_id;
  end if;

  select count(*) into taken
    from public.group_members
   where group_id = new.group_id;

  if taken >= cap then
    raise exception 'group_full' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists group_members_capacity on public.group_members;
create trigger group_members_capacity
  before insert on public.group_members
  for each row execute function public.enforce_group_capacity();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.training_groups enable row level security;
alter table public.group_members   enable row level security;
alter table public.class_groups    enable row level security;

-- Groups are readable by any signed-in user: a member choosing one needs to
-- see the name, coach, focus and cap. None of that is sensitive — the roster
-- is, and that lives in group_members.
drop policy if exists "groups: read" on public.training_groups;
create policy "groups: read"
  on public.training_groups for select
  to authenticated
  using (true);

drop policy if exists "groups: admin write" on public.training_groups;
create policy "groups: admin write"
  on public.training_groups for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A coach manages their own groups, and cannot reassign one to someone else.
drop policy if exists "groups: coach updates own" on public.training_groups;
create policy "groups: coach updates own"
  on public.training_groups for update
  to authenticated
  using (public.is_coach() and trainer_id = auth.uid())
  with check (public.is_coach() and trainer_id = auth.uid());

-- Rosters: your own membership, or the roster of a group you coach. A member
-- can see which groups they are in; they cannot enumerate who else is.
drop policy if exists "group members: read own" on public.group_members;
create policy "group members: read own"
  on public.group_members for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "group members: coach reads roster" on public.group_members;
create policy "group members: coach reads roster"
  on public.group_members for select
  to authenticated
  using (
    exists (
      select 1 from public.training_groups g
       where g.id = group_id and g.trainer_id = auth.uid()
    )
  );

drop policy if exists "group members: admin all" on public.group_members;
create policy "group members: admin all"
  on public.group_members for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No self-join policy, deliberately. Joining is a service-role write from the
-- assignment action, because it has to check the member actually has a
-- subscription of the right tier first — a rule the database cannot express
-- and a member must not be able to skip.

drop policy if exists "class groups: read" on public.class_groups;
create policy "class groups: read"
  on public.class_groups for select
  to authenticated
  using (true);

drop policy if exists "class groups: admin write" on public.class_groups;
create policy "class groups: admin write"
  on public.class_groups for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "class groups: coach targets own class" on public.class_groups;
create policy "class groups: coach targets own class"
  on public.class_groups for all
  to authenticated
  using (
    exists (
      select 1 from public.classes c
       where c.id = class_id and c.trainer_id = auth.uid() and public.is_coach()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
       where c.id = class_id and c.trainer_id = auth.uid() and public.is_coach()
    )
  );
