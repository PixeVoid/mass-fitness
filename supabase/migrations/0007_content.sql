-- ---------------------------------------------------------------------------
-- 0007 — blog posts and FAQ
-- ---------------------------------------------------------------------------
-- Both are stored rather than kept as MDX in the repo. The deciding factor is
-- who writes them: a file-based blog needs a git commit and a deploy per post,
-- which is fine while a developer is the author and fatal the moment anyone
-- else is. The admin panel already exists, so this is the cheaper half.
-- ---------------------------------------------------------------------------

create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  -- Shown on the index and used as the meta description when set. Kept
  -- separate from the body so a listing never has to parse markdown.
  excerpt       text,
  body          text not null default '',
  -- Optional per-post SEO overrides; the title/excerpt are the fallback.
  seo_title     text,
  seo_description text,
  published_at  timestamptz,
  author_id     uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.posts.published_at is
  'Null means draft. A future timestamp is scheduled — reads filter on <= now().';

-- The index and the sitemap both ask the same question: published, newest
-- first.
create index if not exists posts_published_idx
  on public.posts (published_at desc)
  where published_at is not null;

create table if not exists public.faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  -- Groups the list on the page. Free text rather than an enum so adding a
  -- category is a row, not a migration.
  category    text not null default 'General',
  -- Hand-ordered: an FAQ's usefulness is in the order, and alphabetical is
  -- never the right one.
  position    integer not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists faqs_order_idx on public.faqs (position, created_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Same shape as `classes`: publicly readable, admin-writable. Anonymous read
-- is the point — these are the pages search engines are meant to index.
alter table public.posts enable row level security;
alter table public.faqs  enable row level security;

drop policy if exists "posts: public read published" on public.posts;
create policy "posts: public read published"
  on public.posts for select
  using (published_at is not null and published_at <= now());

-- Admins additionally see drafts, so the editor can list them.
drop policy if exists "posts: admin read all" on public.posts;
create policy "posts: admin read all"
  on public.posts for select
  using (public.is_admin());

drop policy if exists "posts: admin write" on public.posts;
create policy "posts: admin write"
  on public.posts for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "faqs: public read published" on public.faqs;
create policy "faqs: public read published"
  on public.faqs for select
  using (published);

drop policy if exists "faqs: admin read all" on public.faqs;
create policy "faqs: admin read all"
  on public.faqs for select
  using (public.is_admin());

drop policy if exists "faqs: admin write" on public.faqs;
create policy "faqs: admin write"
  on public.faqs for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed FAQs
-- ---------------------------------------------------------------------------
-- Enough that the page is not empty on day one, and all questions a visitor
-- actually has before buying. Replace them as the chat logs show what people
-- really ask — that is half the reason those logs exist.
insert into public.faqs (question, answer, category, position)
values
  ('Do I need any equipment to start?',
   'No. Every programme has a no-equipment version, and the live classes are run so that someone with nothing but floor space can follow along. If you own a mat and a set of dumbbells you will get more options, but they are never required.',
   'Getting started', 10),
  ('What if I have never trained before?',
   'That is most of who we coach. Classes are run at three levels simultaneously and the coach calls the regression as well as the progression, so you are following the same session as everyone else at a load that fits you.',
   'Getting started', 20),
  ('How much space do I need?',
   'Roughly the size of a yoga mat, plus room to extend your arms overhead and to the sides. If you can lie down and make a snow angel, you have enough.',
   'Getting started', 30),
  ('Are the classes live, or recordings?',
   'Live. A coach is in the room with you, watching and correcting — that is the whole point. You join from a browser on a phone or laptop; there is nothing to install.',
   'Classes', 10),
  ('Do I have to turn my camera on?',
   'No. You can join with your camera and microphone off and simply follow along, and both start off by default. Turning your camera on is what lets the coach correct your form, so it is worth doing when you can — but it is always your choice.',
   'Classes', 20),
  ('What happens if I miss a class?',
   'Nothing. Sessions run several times a week and your plan does not depend on catching a specific one. Pick the next slot that fits.',
   'Classes', 30),
  ('How do I pay, and is it recurring?',
   'Payment is through PhonePe, once, up front for the term you choose. Nothing renews automatically and we never store your card details.',
   'Membership', 10),
  ('Can I cancel?',
   'Yes. See the refund policy for the terms — in short, there is no lock-in contract and nothing to cancel at the end of a term, since it simply ends.',
   'Membership', 20),
  ('Is the longer plan actually cheaper?',
   'Yes — quarterly is 10% less per month than monthly, and annual is 20% less. The saving is shown against each option at checkout.',
   'Membership', 30),
  ('Is this suitable if I am injured or have a medical condition?',
   'Talk to your doctor first, and then tell your coach. We can work around most things, but we are coaches and not clinicians, and neither the classes nor the in-app assistant are medical advice.',
   'Safety', 10)
on conflict do nothing;
