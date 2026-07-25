-- Mass Fitness — AI assessment leads
--
-- Run against a fresh Supabase project:
--   supabase db push
-- or paste into the SQL editor in the Supabase dashboard.
--
-- Idempotent, same as 0001/0002.

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
-- Captured from the anonymous "Get your AI assessment" chat (/assessment).
-- Written server-side only (service role) from /api/leads — same pattern as
-- chat_logs: an anonymous visitor has no session to key an insert policy off
-- of, and the alternative (a public insert policy) is an open door for spam
-- writes straight from a script. `summary` holds a short excerpt of the chat
-- so support has context without a join back to a conversation that was
-- never persisted anywhere.
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null,
  email      text,
  summary    text,
  source     text not null default 'ai_assessment',
  created_at timestamptz not null default now()
);

create index if not exists leads_created_idx
  on public.leads (created_at desc);

alter table public.leads enable row level security;

-- No insert policy for anon/authenticated: all writes go through the service
-- role in /api/leads, which validates and rate-limits before it ever reaches
-- the database. Admins can read them from the dashboard.
drop policy if exists "leads: admin read" on public.leads;
create policy "leads: admin read"
  on public.leads for select
  to authenticated
  using (public.is_admin());
