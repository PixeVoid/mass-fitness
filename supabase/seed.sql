-- Optional local/staging seed. Do not run against production.
--
-- Everything here is the kind of row that only an admin can create through the
-- app, so it exists to let you exercise the paywall and the LiveKit token
-- route before the admin dashboard (Phase 6) is built.

-- 1. Promote yourself to admin. Log in through the app once first so the row
--    exists, then swap in your own number.
--
--   update public.profiles set role = 'admin' where phone = '+919876543210';

-- 2. Mark yourself as the trainer on a class to get publish rights.
--
--   update public.classes set trainer_id = (
--     select id from public.profiles where phone = '+919876543210'
--   ) where title = 'Morning Strength';

-- 3. A schedule to look at. livekit_room is unique per class — LiveKit creates
--    the room implicitly when the first participant joins with a token for it,
--    so there is nothing to provision on their side.
insert into public.classes (title, trainer_name, scheduled_at, duration_minutes, livekit_room, is_premium)
values
  ('Morning Strength',  'Mass Coach', now() + interval '1 day',  45, 'class-morning-strength-001', true),
  ('HIIT Express',      'Mass Coach', now() + interval '2 days', 30, 'class-hiit-express-001',     true),
  ('Mobility Reset',    'Mass Coach', now() + interval '3 days', 25, 'class-mobility-reset-001',   false)
on conflict (livekit_room) do nothing;

-- 4. Grant yourself a membership so premium classes unlock. This is what the
--    PhonePe callback will do in Phase 3 — until then it is a manual insert.
--
--   insert into public.subscriptions
--     (user_id, plan_tier, plan_duration, amount_paise, status, start_date, end_date)
--   select id, 'group', 'monthly', 149900, 'active', now(), now() + interval '1 month'
--   from public.profiles where phone = '+919876543210';
