-- ---------------------------------------------------------------------------
-- 0006 — scheduled maintenance
-- ---------------------------------------------------------------------------
-- Two jobs that keep stored state honest over time. Both are plain SQL
-- functions so they can be run by hand (or from a Server Action) on a project
-- where pg_cron is not available; the scheduling at the bottom is the
-- convenience, not the mechanism.
-- ---------------------------------------------------------------------------

-- Subscription expiry sweep (BUILD_PLAN open flag 9).
--
-- Access checks already compare against end_date, so an expired member is
-- correctly locked out whether or not this ever runs. What it fixes is the
-- `status` column drifting from reality: /admin reads status, so without this
-- the dashboard steadily overstates how many memberships are live.
create or replace function public.expire_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  swept integer;
begin
  update public.subscriptions
     set status = 'expired'
   where status = 'active'
     and end_date is not null
     and end_date <= now();

  get diagnostics swept = row_count;
  return swept;
end;
$$;

comment on function public.expire_subscriptions() is
  'Flips active subscriptions past their end_date to expired. Idempotent.';

-- Chat log retention.
--
-- chat_logs holds what members ask the assistant, which for a fitness product
-- includes things about their bodies. It earns its keep for support and for
-- seeing what people actually ask, but indefinite retention of that turns a
-- small incident into a serious one. Twelve months is the default; change the
-- number here and re-run to change the policy.
create or replace function public.prune_chat_logs(retain_days integer default 365)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from public.chat_logs
   where created_at < now() - make_interval(days => retain_days);

  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function public.prune_chat_logs(integer) is
  'Deletes chat_logs older than retain_days (default 365). See the privacy policy before changing.';

-- Neither function is callable by a logged-in user: they are security definer,
-- so the default grant to `public` would hand every member the ability to wipe
-- the chat history.
revoke all on function public.expire_subscriptions() from public, anon, authenticated;
revoke all on function public.prune_chat_logs(integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Scheduling
-- ---------------------------------------------------------------------------
-- pg_cron has to be enabled for the project (Dashboard → Database →
-- Extensions). Wrapped so this migration still applies on a project where it
-- is not: the functions above are the contract, and both can be triggered by
-- hand until it is switched on.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;

    -- Hourly rather than daily: a membership that lapsed at 2am should not
    -- read as active in the admin dashboard until the following midnight.
    perform cron.unschedule('expire-subscriptions')
      where exists (select 1 from cron.job where jobname = 'expire-subscriptions');
    perform cron.schedule(
      'expire-subscriptions',
      '7 * * * *',
      $job$ select public.expire_subscriptions(); $job$
    );

    -- Retention only has to be enforced to the day, so this runs off-peak.
    perform cron.unschedule('prune-chat-logs')
      where exists (select 1 from cron.job where jobname = 'prune-chat-logs');
    perform cron.schedule(
      'prune-chat-logs',
      '23 3 * * *',
      $job$ select public.prune_chat_logs(); $job$
    );
  else
    raise notice 'pg_cron unavailable — expire_subscriptions() and prune_chat_logs() must be run manually.';
  end if;
exception
  when insufficient_privilege then
    raise notice 'pg_cron present but not grantable to this role — schedule the two functions from the dashboard.';
end;
$$;
