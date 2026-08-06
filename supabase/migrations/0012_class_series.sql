-- ---------------------------------------------------------------------------
-- 0012 — repeating classes
-- ---------------------------------------------------------------------------
-- A gym timetable is the same session on the same days every week. Creating
-- those one at a time is the sort of chore that stops the schedule being kept
-- up to date at all, which is worse than any bug in this file.
--
-- A series is not a new kind of thing. Each session stays an ordinary row in
-- `classes` — it has its own status, its own room, its own reminders, and can
-- be edited or cancelled on its own. `series_id` only records that a group of
-- them were created together, so the admin list can fold them up and so
-- "cancel the rest of this routine" has something to select on.
--
-- Deliberately not a `series` table. A parent row would have to answer what
-- happens when one session moves, and the answer is "nothing" — there is no
-- shared state to keep in step, so there is nothing for a parent to own.
-- ---------------------------------------------------------------------------

alter table public.classes
  add column if not exists series_id uuid;

comment on column public.classes.series_id is
  'Groups sessions created as one repeating routine. Null for one-offs. Not a foreign key: there is no parent row, only a shared label.';

-- The admin list groups by series, and cancelling the remainder of a routine
-- selects on series plus a time bound.
create index if not exists classes_series_idx
  on public.classes (series_id, scheduled_at)
  where series_id is not null;
