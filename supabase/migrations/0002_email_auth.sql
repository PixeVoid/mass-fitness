-- Mass Fitness — switch the account key from phone to email (BUILD_PLAN
-- section 0, auth row).
--
-- Phone OTP required an Indian SMS/WhatsApp provider before a single login
-- could be tested — DLT registration and WhatsApp Business approval both run
-- days to weeks. Email OTP and Google OAuth are both free at this scale and
-- need no provider account beyond Supabase itself, so they replace phone as
-- the primary path. Phone stays on the table as an optional contact field
-- (class reminders), it just stops being unique or auth-bearing.
--
-- Idempotent, like 0001.

-- profiles.phone was unique because it was the auth key. It no longer is —
-- multiple members may leave it blank, and a stale unique constraint would
-- reject the second null... except Postgres treats NULLs as distinct for
-- uniqueness, so this was only ever a latent footgun for real duplicate
-- numbers. Drop it regardless since phone is not what identifies an account
-- anymore.
alter table public.profiles drop constraint if exists profiles_phone_key;

-- email is now the account key. Partial (where not null) rather than a plain
-- unique column: existing rows created before this migration may have a null
-- email if they signed up before this switch, and a plain unique index would
-- still allow that (Postgres does not compare nulls as equal), but a partial
-- index says so explicitly and stays correct if a future migration ever adds
-- a NOT NULL constraint.
create unique index if not exists profiles_email_unique_idx
  on public.profiles (email)
  where email is not null;

-- Backfill name from Google's OAuth payload when it's present, so onboarding
-- can prefill instead of asking someone Google already told us the name of.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, phone, email, name)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
