-- Optional local/staging seed. Do not run against production.
--
-- Everything below can now be done from /admin instead — this exists so a
-- fresh database has something on the schedule before you have clicked
-- anything, and as a record of the one step that is still SQL.

-- 1. Promote yourself to admin. Log in through the app once first so the row
--    exists, then swap in your own address. Accounts are keyed on email since
--    migration 0002 — phone is an optional contact field, not the login.
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
--    Everything after this — trainers, groups, classes, memberships — is done
--    in /admin. This is the only statement you should ever need to run by hand.

-- 2. A schedule to look at. `livekit_room` is unique per class; the video room
--    is created implicitly when the first participant joins with a token for
--    it, so there is nothing to provision on the provider's side.
--
--    `audience` defaults to 'all', which is what you want before any training
--    groups exist — a class targeted at groups when there are none reaches
--    nobody. Create groups at /admin/groups, then target them from /coach.
insert into public.classes
  (title, trainer_name, scheduled_at, duration_minutes, livekit_room, is_premium)
values
  ('Morning Strength',  'Mass Coach', now() + interval '1 day',  45, 'class-morning-strength-001', true),
  ('HIIT Express',      'Mass Coach', now() + interval '2 days', 30, 'class-hiit-express-001',     true),
  ('Mobility Reset',    'Mass Coach', now() + interval '3 days', 25, 'class-mobility-reset-001',   false)
on conflict (livekit_room) do nothing;

-- 3. Grant yourself a membership so premium classes unlock, without going
--    through a payment. /admin/members does the same with a button, and
--    PAYMENT_PROVIDER=mock walks the real checkout end to end — prefer either
--    of those. Amounts are paise: 250000 = ₹2,500, the current Group monthly.
--
--   insert into public.subscriptions
--     (user_id, plan_tier, plan_duration, amount_paise, status, start_date, end_date)
--   select id, 'group', 'monthly', 250000, 'active', now(), now() + interval '1 month'
--   from public.profiles where email = 'you@example.com';
--
--    A membership alone is no longer enough to see a class aimed at a group —
--    join one at /subscribe/group, or add yourself from /admin/groups.
