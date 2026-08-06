-- ---------------------------------------------------------------------------
-- 0010 — durable rate limiting for anonymous endpoints
-- ---------------------------------------------------------------------------
-- The chat's limits already come from `chat_logs`, which works because a
-- signed-in member has rows to count. The self-assessment has no session: it
-- is keyed on IP, and the in-process limiter it used gave each serverless
-- instance its own counter, so the real ceiling was `limit x concurrent
-- instances` and it reset on every cold start.
--
-- The bucket key is a **salted hash**, never an address. Rate limiting is a
-- legitimate use of an IP, but storing one is storing personal data, and
-- nothing here needs the ability to reverse it — only to recognise the same
-- caller within a window.
create table if not exists public.rate_limits (
  bucket     text primary key,
  count      integer not null default 0,
  expires_at timestamptz not null
);

create index if not exists rate_limits_expiry_idx
  on public.rate_limits (expires_at);

alter table public.rate_limits enable row level security;
-- No policies. Only the service-role caller touches this, and it bypasses RLS.

/**
 * Increments a bucket and reports whether it is over the limit.
 *
 * One statement, so the read and the write cannot be interleaved by a
 * concurrent request the way a select-then-update can. `on conflict` makes the
 * first caller in a window create the row and everyone after increment it.
 */
create or replace function public.bump_rate_limit(
  p_bucket     text,
  p_limit      integer,
  p_window_sec integer
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count integer;
  window_end    timestamptz;
begin
  insert into public.rate_limits as rl (bucket, count, expires_at)
  values (p_bucket, 1, now() + make_interval(secs => p_window_sec))
  on conflict (bucket) do update
    set count = case
          -- Expired window: start a fresh one rather than carrying the count.
          when rl.expires_at <= now() then 1
          else rl.count + 1
        end,
        expires_at = case
          when rl.expires_at <= now()
            then now() + make_interval(secs => p_window_sec)
          else rl.expires_at
        end
  returning rl.count, rl.expires_at into current_count, window_end;

  return query
    select current_count <= p_limit,
           greatest(1, ceil(extract(epoch from (window_end - now())))::integer);
end;
$$;

revoke all on function public.bump_rate_limit(text, integer, integer)
  from public, anon, authenticated;

-- Expired buckets are dead weight; the maintenance job sweeps them.
create or replace function public.prune_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from public.rate_limits where expires_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_rate_limits() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    perform cron.unschedule('prune-rate-limits')
      where exists (select 1 from cron.job where jobname = 'prune-rate-limits');
    perform cron.schedule(
      'prune-rate-limits',
      '41 4 * * *',
      $job$ select public.prune_rate_limits(); $job$
    );
  end if;
exception
  when others then
    raise notice 'pg_cron unavailable — run prune_rate_limits() manually.';
end;
$$;
